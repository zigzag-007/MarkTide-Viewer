// Dialogs collect values; the command layer owns model validation and edits.
(function (win) {
  const editing = win.MarkTideMarkdownEditing;
  let dismiss = null;

  function destination(value, image = false) {
    const url = value.trim();
    if (!url || /[\u0000-\u001f\u007f]/.test(url)) throw new Error('Enter a valid URL.');
    const scheme = url.match(/^([a-z][a-z0-9+.-]*):/i)?.[1].toLowerCase();
    const allowed = image ? ['http', 'https'] : ['http', 'https', 'mailto', 'tel'];
    if (image && /^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/]+={0,2}$/i.test(url)) allowed.push('data');
    if (scheme && !allowed.includes(scheme)) throw new Error('Use a web URL or a safe relative path.');
    if (!win.DOMPurify.isValidAttribute(image ? 'img' : 'a', image ? 'src' : 'href', url)) throw new Error('This URL is not allowed.');
    return encodeURI(url).replace(/%25([a-f0-9]{2})/gi, '%$1')
      .replace(/[()<>\\]/g, character => '%' + character.charCodeAt(0).toString(16).toUpperCase());
  }

  function ask(ctx, title, fields, validate, layout = '') {
    dismiss?.();
    return new Promise(resolve => {
      const dialog = win.document.createElement('dialog');
      dialog.className = 'editor-insertion-dialog' + (layout ? ` editor-insertion-${layout}` : '');
      const heading = win.document.createElement('h2');
      heading.id = 'editor-insertion-heading';
      heading.textContent = title;
      dialog.setAttribute('aria-labelledby', heading.id);
      const form = win.document.createElement('form');
      const controls = {};
      for (const field of fields) {
        const container = win.document.createElement('label');
        container.textContent = field.label;
        const input = win.document.createElement('input');
        input.type = field.type || 'text';
        input.name = field.id;
        input.value = field.value ?? '';
        input.placeholder = field.placeholder || '';
        input.required = Boolean(field.required);
        if (field.min != null) input.min = String(field.min);
        if (field.max != null) input.max = String(field.max);
        controls[field.id] = input;
        container.append(input);
        form.append(container);
      }
      const error = win.document.createElement('p');
      error.className = 'editor-insertion-error';
      error.hidden = true;
      error.setAttribute('role', 'alert');
      if (layout === 'table') {
        const hint = win.document.createElement('p');
        hint.className = 'editor-insertion-hint';
        hint.id = 'editor-table-hint';
        hint.textContent = 'The first row is a header.';
        controls.rows.setAttribute('aria-describedby', hint.id);
        form.append(hint);
      }
      const actions = win.document.createElement('div');
      actions.className = 'editor-insertion-actions';
      const cancel = win.document.createElement('button');
      cancel.type = 'button';
      cancel.textContent = 'Cancel';
      const submit = win.document.createElement('button');
      submit.type = 'submit';
      submit.textContent = 'Insert';
      actions.append(cancel, submit);
      form.append(error, actions);
      dialog.append(heading, form);
      const finish = value => {
        dismiss = null;
        dialog.close();
        dialog.remove();
        if (!ctx.model.isDisposed() && ctx.editor.getModel() === ctx.model) ctx.editor.focus();
        resolve(value);
      };
      dismiss = () => finish(null);
      cancel.addEventListener('click', () => finish(null));
      dialog.addEventListener('cancel', event => { event.preventDefault(); finish(null); });
      form.addEventListener('submit', event => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        try {
          const values = Object.fromEntries(Object.entries(controls).map(([id, input]) => [id, input.value]));
          finish(validate(values));
        } catch (failure) { error.textContent = failure.message; error.hidden = false; }
      });
      win.document.body.append(dialog);
      dialog.showModal();
      Object.values(controls)[0].select();
    });
  }

  async function link(ctx) {
    const target = editing.linkTarget(ctx.source, ctx.offsets, win.marked, false);
    return ask(ctx, 'Insert link', [
      { id: 'label', label: 'Link text', value: target.label },
      { id: 'url', label: 'URL', value: target.url, required: true },
    ], fields => editing.link(ctx.source, ctx.offsets, target, fields.label, destination(fields.url), false));
  }

  function pickImage(ctx) {
    dismiss?.();
    return new Promise((resolve, reject) => {
      const input = win.document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.hidden = true;
      const reader = new win.FileReader();
      const image = new win.Image();
      let finished = false;
      const finish = (value, error) => {
        if (finished) return;
        finished = true;
        dismiss = null;
        input.remove();
        reader.onload = reader.onerror = image.onload = image.onerror = null;
        if (reader.readyState === win.FileReader.LOADING) reader.abort();
        if (!ctx.model.isDisposed() && ctx.editor.getModel() === ctx.model) ctx.editor.focus();
        if (error) reject(error); else resolve(value);
      };
      dismiss = () => finish(null);
      input.addEventListener('cancel', () => finish(null), { once: true });
      input.addEventListener('change', () => {
        if (finished) return;
        const file = input.files[0];
        if (!file) { finish(null); return; }
        if (!/^image\//i.test(file.type)) { finish(null, new Error('Choose an image file.')); return; }
        reader.onerror = () => finish(null, new Error('This image could not be read.'));
        reader.onload = () => {
          // Decode before embedding so a renamed or damaged file is not inserted.
          image.onload = () => finish(String(reader.result));
          image.onerror = () => finish(null, new Error('This image format could not be opened. Choose another image.'));
          image.src = String(reader.result);
        };
        try { reader.readAsDataURL(file); }
        catch (error) { finish(null, new Error('This image could not be read.')); }
      }, { once: true });
      win.document.body.append(input);
      try { input.click(); }
      catch (error) { finish(null, new Error('The image picker could not be opened.')); }
    });
  }

  async function image(ctx, { source = 'url' } = {}) {
    const embedded = source === 'file' ? await pickImage(ctx) : null;
    if (source === 'file' && !embedded) return null;
    if (ctx.model.isDisposed() || ctx.editor.getModel() !== ctx.model || ctx.model.getVersionId() !== ctx.version) {
      throw new Error('The document changed. Please select the image again.');
    }
    const target = editing.linkTarget(ctx.source, ctx.offsets, win.marked, true);
    return ask(ctx, 'Insert image', [
      { id: 'label', label: 'Alternative text', value: target.label, placeholder: 'Figure 1: Describe the image' },
      { id: 'url', label: 'Image URL', value: embedded || target.url, placeholder: 'https://example.com/image.png', required: true },
    ], fields => editing.link(ctx.source, ctx.offsets, target, fields.label, destination(fields.url, true), true), 'image');
  }

  async function codeBlock(ctx) {
    const target = editing.codeBlockTarget(ctx.source, ctx.offsets, win.marked);
    return ask(ctx, 'Insert code block', [{ id: 'language', label: 'Language (optional)', value: target.language }],
      fields => editing.codeBlock(ctx.source, ctx.offsets, target, fields.language));
  }

  async function table(ctx, dimensions) {
    const insert = (rows, columns) => editing.table(ctx.source, ctx.offsets, rows, columns, { includesHeader: true });
    if (dimensions) return insert(dimensions.rows, dimensions.columns);
    return ask(ctx, 'Insert table', [
      { id: 'columns', label: 'Columns', type: 'number', value: '3', min: 1, max: 12, required: true },
      { id: 'rows', label: 'Rows', type: 'number', value: '3', min: 1, max: 21, required: true },
    ], fields => insert(Number(fields.rows), Number(fields.columns)), 'table');
  }

  win.MarkTideInsertionTools = { link, image, codeBlock, table, destination,
    destroy: () => dismiss?.() };
})(window);
