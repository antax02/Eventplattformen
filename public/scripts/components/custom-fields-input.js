export default class CustomFieldsInput {
  constructor(containerElement, options = {}) {
    this.container = containerElement;
    this.fields = options.initialFields || [];
    this.onChange = options.onChange || (() => {});

    this.render();
    this.setupEventListeners();
  }

  render() {
    this.container.innerHTML = `
      <div class="custom-fields">
        <div class="fields-list"></div>
        <button type="button" id="add-field-btn" class="btn add-field-btn">Lägg till fält</button>
        <input type="hidden" name="customFieldsJson" value="[]">
      </div>
    `;

    this.fieldsList = this.container.querySelector('.fields-list');
    this.addFieldBtn = this.container.querySelector('#add-field-btn');
    this.customFieldsJsonInput = this.container.querySelector('input[name="customFieldsJson"]');

    this.renderFields();
  }

  setupEventListeners() {
    this.addFieldBtn.addEventListener('click', () => {
      this.addField();
    });
  }

  renderFields() {
    this.fieldsList.innerHTML = '';
    this.customFieldsJsonInput.value = JSON.stringify(this.fields);

    this.fields.forEach((field, index) => {
      const fieldElement = document.createElement('div');
      fieldElement.className = 'field-item';

      fieldElement.innerHTML = `
        <div class="field-row">
          <label class="field-label">Fältnamn</label>
          <input type="text" class="input text-input field-name-input" value="${field.label || ''}" required>
        </div>
        <div class="field-row">
          <label class="field-label">Typ:</label>
          <select class="input select field-type">
            <option value="text" ${field.type === 'text' ? 'selected' : ''}>Text</option>
            <option value="number" ${field.type === 'number' ? 'selected' : ''}>Nummer</option>
            <option value="email" ${field.type === 'email' ? 'selected' : ''}>E-post</option>
            <option value="tel" ${field.type === 'tel' ? 'selected' : ''}>Telefon</option>
            <option value="date" ${field.type === 'date' ? 'selected' : ''}>Datum</option>
          </select>
        </div>

        <div class="field-row">
          <label class="checkbox-label">
            <input type="checkbox" class="checkbox field-required" ${field.required ? 'checked' : ''}>
            Obligatoriskt
          </label>
        </div>
        <button type="button" class="btn danger-btn small-btn remove-field" data-index="${index}">Ta bort</button>
      `;

      const nameInput = fieldElement.querySelector('.field-name-input');
      const typeSelect = fieldElement.querySelector('.field-type');
      const requiredCheckbox = fieldElement.querySelector('.field-required');
      const removeButton = fieldElement.querySelector('.remove-field');

      nameInput.addEventListener('input', () => {
        this.updateField(index);
      });

      nameInput.addEventListener('blur', () => {
        this.updateField(index);
      });

      typeSelect.addEventListener('change', () => {
        this.updateField(index);
      });

      requiredCheckbox.addEventListener('change', () => {
        this.updateField(index);
      });

      removeButton.addEventListener('click', () => {
        this.removeField(index);
      });

      this.fieldsList.appendChild(fieldElement);
    });
  }

  updateField(index) {
    const fieldElement = this.fieldsList.children[index];
    if (!fieldElement) return;
    
    const nameInput = fieldElement.querySelector('.field-name-input');
    const typeSelect = fieldElement.querySelector('.field-type');
    const requiredCheckbox = fieldElement.querySelector('.field-required');
    
    if (!nameInput || !typeSelect || !requiredCheckbox) return;
    
    const label = nameInput.value.trim();
    const type = typeSelect.value;
    const required = requiredCheckbox.checked;

    this.fields[index] = {
      id: this.fields[index].id,
      label,
      type,
      required
    };

    this.onChange(this.fields);
    this.customFieldsJsonInput.value = JSON.stringify(this.fields);
  }

  addField() {
    const newField = {
      id: `field_${Date.now()}`,
      label: '',
      type: 'text',
      required: false
    };

    this.fields.push(newField);
    this.renderFields();
    this.onChange(this.fields);
  }

  removeField(index) {
    this.fields.splice(index, 1);
    this.renderFields();
    this.onChange(this.fields);
  }

  getFields() {
    return [...this.fields];
  }

  setFields(fields) {
    this.fields = fields;
    this.renderFields();
    this.onChange(this.fields);
  }
}