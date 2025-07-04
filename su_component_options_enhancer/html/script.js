// script.js
document.addEventListener('DOMContentLoaded', () => {
    const optionsContainer = document.getElementById('options-container');
    const componentNameElement = document.getElementById('component-name');
    const applyButton = document.getElementById('btn-apply');
    const resetButton = document.getElementById('btn-reset-all');
    const searchInput = document.getElementById('search-input');

    let originalOptionsData = {}; // To store initial data for reset

    // --- Comunicación con SketchUp ---
    // El objeto 'sketchup' es inyectado por UI::HtmlDialog
    // Estas funciones serán llamadas desde Ruby.
    window.sketchupConnector = {
        setOptionsData: function(data) {
            logToRuby("setOptionsData called with: " + JSON.stringify(data).substring(0, 200) + "...");
            originalOptionsData = JSON.parse(JSON.stringify(data)); // Deep copy
            componentNameElement.textContent = data.componentName || "Component Options";
            populateOptions(data.options);
        },
        showError: function(message) {
            // Podríamos tener un área de mensajes en el HTML en lugar de alert
            alert("Error: " + message);
            logToRuby("showError called: " + message);
        },
        showSuccess: function(message) {
            // Podríamos tener un área de mensajes temporal
            logToRuby("showSuccess called: " + message);
            // Quizás un toast notification simple
            const toast = document.createElement('div');
            toast.textContent = message;
            toast.style.position = 'fixed';
            toast.style.bottom = '20px';
            toast.style.left = '50%';
            toast.style.transform = 'translateX(-50%)';
            toast.style.padding = '10px 20px';
            toast.style.backgroundColor = '#4CAF50';
            toast.style.color = 'white';
            toast.style.borderRadius = '5px';
            toast.style.zIndex = '1000';
            document.body.appendChild(toast);
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 3000);
        }
    };

    function logToRuby(message) {
        if (window.sketchup && window.sketchup.logMessage) {
            window.sketchup.logMessage(message);
        } else {
            console.log("(Ruby Log): " + message); // Fallback para navegador
        }
    }

    function populateOptions(optionsByDictionary) {
        optionsContainer.innerHTML = ''; // Limpiar opciones existentes

        if (!optionsByDictionary || Object.keys(optionsByDictionary).length === 0) {
            optionsContainer.innerHTML = '<p>No options available for this component.</p>';
            return;
        }

        for (const dictName in optionsByDictionary) {
            const attributes = optionsByDictionary[dictName];
            // Omitir diccionarios vacíos o aquellos que no queremos mostrar (ej. "_...")
            if (dictName.startsWith("_") || Object.keys(attributes).length === 0) continue;

            const section = document.createElement('div');
            section.className = 'collapsible-section';

            const header = document.createElement('button');
            header.className = 'collapsible-header';
            header.innerHTML = `<span class="icon">+</span> <span class="section-title">${dictName}</span>`;

            const content = document.createElement('div');
            content.className = 'collapsible-content';

            for (const key in attributes) {
                // Omitir atributos que empiezan con "_" (convención para privados/meta en DC)
                // excepto los que hemos decidido explícitamente manejar si Ruby los pasa directamente.
                // La lógica de Ruby en ComponentManager debería pre-filtrar y formatear esto.
                // Si Ruby pasa _lenx_label, no queremos un input para ello.
                if (key.startsWith("_")) continue;


                const value = attributes[key];

                const optionItem = document.createElement('div');
                optionItem.className = 'option-item';
                optionItem.setAttribute('data-original-value', String(value));
                optionItem.setAttribute('data-original-type', typeof value);


                const labelText = attributes[`_${key}_label`] || key;
                const label = document.createElement('label');
                label.setAttribute('for', `attr_${dictName}_${key}`);
                label.textContent = `${labelText}:`;

                const inputWrapper = document.createElement('div');
                inputWrapper.className = 'option-input-wrapper';

                let inputElement;
                let unit = attributes[`_${key}_units`] || '';


                const dcFormtype = attributes[`_${key}_formtype`];
                const dcOptions = attributes[`_${key}_options`];

                if (dcFormtype === "CHECKBOX" || typeof value === 'boolean' || (dcOptions === "True|False" || dcOptions === "Yes|No" || dcOptions === "1|0")){
                    inputElement = document.createElement('input');
                    inputElement.type = 'checkbox';
                    inputElement.checked = Boolean(value) || String(value).toLowerCase() === 'true' || String(value).toLowerCase() === 'yes' || Number(value) === 1;
                } else if (dcOptions && typeof dcOptions === 'string') {
                    inputElement = document.createElement('select');
                    const optionsArray = dcOptions.split('|');
                    optionsArray.forEach(optString => {
                        const parts = optString.split('::');
                        const optValue = parts[0];
                        const optLabel = parts[1] || optValue;
                        const optionTag = document.createElement('option');
                        optionTag.value = optValue;
                        optionTag.textContent = optLabel;
                        inputElement.appendChild(optionTag);
                    });
                    inputElement.value = String(value);
                } else if (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '' && !isNaN(Number(value)))) {
                     inputElement = document.createElement('input');
                     inputElement.type = 'number';
                     inputElement.value = Number(value);
                     if (String(value).includes('.')) inputElement.step = "any";
                     else inputElement.step = "1";

                     if (typeof value === 'string' && !unit) {
                        const match = value.match(/[a-zA-Z%]+$/);
                        if (match) unit = match[0];
                     }

                } else {
                    inputElement = document.createElement('input');
                    inputElement.type = 'text';
                    inputElement.value = String(value);
                }

                inputElement.id = `attr_${dictName}_${key}`;
                inputElement.setAttribute('data-dictionary', dictName);
                inputElement.setAttribute('data-key', key);

                inputWrapper.appendChild(inputElement);
                if (unit) {
                    const unitSpan = document.createElement('span');
                    unitSpan.className = 'unit';
                    unitSpan.textContent = unit;
                    inputWrapper.appendChild(unitSpan);
                }

                const tooltipTextContent = attributes[`_${key}_description`] || `Original Value: ${value}\n(Type: ${typeof value})`;
                const tooltip = document.createElement('div');
                tooltip.className = 'tooltip';
                tooltip.textContent = '?';
                const tooltipSpan = document.createElement('span');
                tooltipSpan.className = 'tooltiptext';
                tooltipSpan.textContent = tooltipTextContent;
                tooltip.appendChild(tooltipSpan);

                optionItem.appendChild(label);
                optionItem.appendChild(inputWrapper);
                optionItem.appendChild(tooltip);
                content.appendChild(optionItem);
            }

            section.appendChild(header);
            section.appendChild(content);
            optionsContainer.appendChild(section);
        }
        addCollapsibleEventListeners();
    }

    function addCollapsibleEventListeners() {
        const headers = document.querySelectorAll('.collapsible-header');
        headers.forEach(header => {
            header.addEventListener('click', () => {
                const content = header.nextElementSibling;
                const icon = header.querySelector('.icon');
                content.classList.toggle('open');
                icon.textContent = content.classList.contains('open') ? '-' : '+';
            });
        });

        const firstSectionContent = optionsContainer.querySelector('.collapsible-section .collapsible-content');
        if (firstSectionContent) {
            firstSectionContent.classList.add('open');
            const firstSectionHeaderIcon = optionsContainer.querySelector('.collapsible-section .collapsible-header .icon');
            if (firstSectionHeaderIcon) firstSectionHeaderIcon.textContent = '-';
        }
    }

    applyButton.addEventListener('click', () => {
        const updatedOptions = {};
        const inputs = optionsContainer.querySelectorAll('input[data-dictionary], select[data-dictionary]');

        inputs.forEach(input => {
            const dictName = input.getAttribute('data-dictionary');
            const key = input.getAttribute('data-key');
            let value = input.type === 'checkbox' ? input.checked : input.value;

            const originalType = input.closest('.option-item').getAttribute('data-original-type');
            const originalValueString = input.closest('.option-item').getAttribute('data-original-value');

            if (input.type === 'number' && value !== "") {
                value = Number(value);
            } else if (input.type === 'checkbox') {
                 if (originalType === 'number' || (!isNaN(Number(originalValueString)) && originalValueString.trim() !== '')) {
                    value = value ? 1 : 0;
                }
            }

            if (!updatedOptions[dictName]) {
                updatedOptions[dictName] = {};
            }
            updatedOptions[dictName][key] = value;
        });

        logToRuby("Applying options: " + JSON.stringify(updatedOptions));
        if (window.sketchup && window.sketchup.updateOptions) {
            window.sketchup.updateOptions(updatedOptions);
        } else {
            console.warn("sketchup.updateOptions callback not found. Outputting to console.");
        }
    });

    resetButton.addEventListener('click', () => {
        if (originalOptionsData && originalOptionsData.options) {
            populateOptions(originalOptionsData.options);
        }
        logToRuby("Options reset in dialog.");
    });

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const allOptionItems = optionsContainer.querySelectorAll('.option-item');
        const allSections = optionsContainer.querySelectorAll('.collapsible-section');

        allOptionItems.forEach(item => {
            const label = item.querySelector('label');
            let textContent = (label ? label.textContent.toLowerCase() : '');
            const inputElement = item.querySelector('input, select');
            if (inputElement) {
                if (inputElement.tagName === 'SELECT') {
                    textContent += ' ' + Array.from(inputElement.options).map(o => o.text.toLowerCase()).join(' ');
                } else {
                    textContent += ' ' + inputElement.value.toLowerCase();
                }
            }

            const originalLabelText = label ? (label.getAttribute('data-original-text') || label.textContent) : '';
            if (label && !label.hasAttribute('data-original-text')) {
                 label.setAttribute('data-original-text', label.textContent);
            }

            if (textContent.includes(searchTerm)) {
                item.classList.remove('hidden-by-search');
                if (label && searchTerm) {
                    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                    label.innerHTML = originalLabelText.replace(regex, '<span class="highlight">$1</span>');
                } else if (label) {
                    label.innerHTML = originalLabelText;
                }
            } else {
                item.classList.add('hidden-by-search');
                if (label) {
                    label.innerHTML = originalLabelText;
                }
            }
        });

        allSections.forEach(section => {
            const visibleItems = section.querySelectorAll('.option-item:not(.hidden-by-search)');
            const content = section.querySelector('.collapsible-content');
            const header = section.querySelector('.collapsible-header');
            if (visibleItems.length > 0) {
                section.classList.remove('hidden-by-search');
                if (searchTerm && content && !content.classList.contains('open') && header) {
                    content.classList.add('open');
                    header.querySelector('.icon').textContent = '-';
                }
            } else {
                section.classList.add('hidden-by-search');
            }
        });
    });

    if (window.sketchup && window.sketchup.requestInitialData) {
        logToRuby("Dialog DOMContentLoaded. Requesting initial data from SketchUp...");
        window.sketchup.requestInitialData();
    } else {
        logToRuby("Sketchup bridge not found. Loading sample data for browser testing.");
        loadSampleDataForBrowser();
    }

    function loadSampleDataForBrowser() {
        const sampleData = {
            componentName: "Sample Dynamic Door (Browser)",
            options: {
                "dynamic_attributes": {
                    "lenx": "100.0cm",
                    "_lenx_label": "Width",
                    "_lenx_description": "The overall width of the door.\nCan be numeric or a length string.",
                    "lenz": 210.0,
                    "_lenz_label": "Height",
                    "_lenz_units": "cm",
                    "_lenz_description": "The overall height of the door.",
                    "material": "Wood",
                    "_material_options": "Wood|Metal|Glass",
                    "_material_label": "Material Type",
                    "hinges": "Left", // Valor actual
                    "_hinges_label": "Hinge Side",
                    "_hinges_options": "Left::Left Hand Hung|Right::Right Hand Hung",
                    "_hinges_description": "Select the side for the hinges.",
                    "showdetails": 1,
                    "_showdetails_label": "Display Details",
                    "_showdetails_formtype": "CHECKBOX",
                    "_showdetails_description": "Toggles visibility of detailed elements.",
                    "isopenable": "True",
                     "_isopenable_label": "Is Openable",
                     "_isopenable_options": "True|False",
                     "_isopenable_description": "Can the door be opened in animations?"
                },
                "SU_DefinitionSet": {
                    "Price": "250.00",
                    "Size": "100cm x 210cm",
                    "Url": "http://example.com/door"
                }
            }
        };
        window.sketchupConnector.setOptionsData(sampleData);
    }
});
```
