function monitorPageErrors(page) {
  const errors = [];

  page.on('pageerror', (error) => {
    errors.push(`pageerror: ${error.message}`);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(`console: ${message.text()}`);
    }
  });

  return {
    assertEmpty(expect) {
      expect(errors, errors.join('\n')).toEqual([]);
    },
    errors,
  };
}

module.exports = {
  monitorPageErrors,
};
