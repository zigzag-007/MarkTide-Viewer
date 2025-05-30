// Mermaid diagram handling functionality

class MermaidHandler {
  constructor() {
    this.initialized = false;
  }

  initMermaid() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const mermaidTheme = currentTheme === "dark" ? "dark" : "base";
    
    let themeVariables = {};
    if (currentTheme === "dark") {
      themeVariables = {
        primaryColor: '#30363d',
        primaryTextColor: '#e4e1f0',
        primaryBorderColor: '#8b7cf8',
        lineColor: '#8b7cf8',
        secondaryColor: '#21262d',
        tertiaryColor: '#161b22',
        background: '#1a1625',
        mainBkg: '#21262d',
        secondBkg: '#30363d',
        tertiaryBkg: '#161b22'
      };
    } else {
      themeVariables = {
        primaryColor: '#f9f9f9',
        primaryTextColor: '#24292e',
        primaryBorderColor: '#d1d5da',
        lineColor: '#24292e',
        secondaryColor: '#e8f5e8',
        tertiaryColor: '#fff3e0'
      };
    }
    
    mermaid.initialize({
      startOnLoad: false,
      theme: mermaidTheme,
      themeVariables: themeVariables,
      securityLevel: 'loose',
      flowchart: { useMaxWidth: true, htmlLabels: true },
      fontSize: 16
    });

    this.initialized = true;
  }

  renderDiagrams(container) {
    if (!this.initialized) {
      this.initMermaid();
    }

    try {
      mermaid.init(undefined, container.querySelectorAll('.mermaid'));
    } catch (e) {
      console.warn("Mermaid rendering failed:", e);
    }
  }

  // Get theme variables for print mode (always light)
  getPrintThemeVariables() {
    return {
      primaryColor: '#f6f8fa',
      primaryTextColor: '#24292e',
      primaryBorderColor: '#24292e',
      lineColor: '#24292e',
      secondaryColor: '#f6f8fa',
      tertiaryColor: '#ffffff',
      background: '#ffffff',
      mainBkg: '#f6f8fa',
      secondBkg: '#f6f8fa',
      nodeBorder: '#24292e',
      clusterBkg: '#f6f8fa',
      edgeLabelBackground: '#ffffff'
    };
  }

  initForPrint(printWindow) {
    const themeVariables = this.getPrintThemeVariables();
    
    printWindow.mermaid.initialize({
      startOnLoad: false,
      theme: "base",
      themeVariables: themeVariables,
      securityLevel: 'loose',
      flowchart: { 
        useMaxWidth: true, 
        htmlLabels: true,
        curve: 'basis'
      },
      fontSize: 16
    });
  }
}

// Create global instance
window.MarkFlowMermaid = new MermaidHandler();