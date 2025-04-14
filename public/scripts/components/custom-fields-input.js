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
        <div class="custom-fields__list"></div>
        <button type="button" id="add-field-btn" class="btn add-field-btn">Lägg till fält</button>
        <input type="hidden" name="customFieldsJson" value="[]">
      </div>
    `;

    this.fieldsList = this.container.querySelector('.custom-fields__list');
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
        <div class="form__field-row">
          <label class="field-label">Fältnamn:</label>
          <input type="text" class="input input--text field-label" value="${field.label}" required>
        </div>
        <div class="form__field-row">
          <label class="field-label">Typ:</label>
          <select class="input input--select field-type">
            <option value="text" ${field.type === 'text' ? 'selected' : ''}>Text</option>
            <option value="number" ${field.type === 'number' ? 'selected' : ''}>Nummer</option>
            <option value="email" ${field.type === 'email' ? 'selected' : ''}>E-post</option>
            <option value="tel" ${field.type === 'tel' ? 'selected' : ''}>Telefon</option>
            <option value="date" ${field.type === 'date' ? 'selected' : ''}>Datum</option>
          </select>
        </div>

        <div class="form__field-row">
          <label class="checkbox-label">
            <input type="checkbox" class="input--checkbox field-required" ${field.required ? 'checked' : ''}>
            Obligatoriskt
          </label>
        </div>
        <button type="button" class="btn btn--danger btn--small remove-field" data-index="${index}">Ta bort</button>
      `;

      const typeSelect = fieldElement.querySelector('.field-type');

      typeSelect.addEventListener('change', () => {
        this.updateField(index);
      });

      fieldElement.querySelector('.field-label').addEventListener('input', () => {
        this.updateField(index);
      });

      fieldElement.querySelector('.field-required').addEventListener('change', () => {
        this.updateField(index);
      });

      fieldElement.querySelector('.remove-field').addEventListener('click', () => {
        this.removeField(index);
      });

      this.fieldsList.appendChild(fieldElement);
    });
  }

  updateField(index) {
    const fieldElement = this.fieldsList.children[index];
    const label = fieldElement.querySelector('.field-label').value.trim();
    const type = fieldElement.querySelector('.field-type').value;
    const required = fieldElement.querySelector('.field-required').checked;

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