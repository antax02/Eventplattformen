export default class EmailTagInput {
  constructor(containerElement, options = {}) {
    this.container = containerElement;
    this.emails = options.initialEmails || [];
    this.onChange = options.onChange || (() => {});
    this.maxDisplayedEmails = options.maxDisplayedEmails || 5;
    this.showingAllEmails = false;

    this.render();
    this.setupEventListeners();
  }

  render() {
    this.container.innerHTML = `
      <div class="email-tag-input-container">
        <input
          type="email"
          placeholder="Ange e-postadress och tryck Enter"
          class="input-field email-input"
        />
        <div class="email-tags"></div>
        <div class="email-tags-more" style="display: none;">
          <button type="button" class="btn show-more-btn">Visa fler...</button>
        </div>
        <div class="invalid-feedback" style="display: none; color: red;"></div>
      </div>
    `;

    this.inputElement = this.container.querySelector('.email-input');
    this.tagsContainer = this.container.querySelector('.email-tags');
    this.tagsMoreContainer = this.container.querySelector('.email-tags-more');
    this.showMoreBtn = this.container.querySelector('.show-more-btn');
    this.feedbackElement = this.container.querySelector('.invalid-feedback');

    this.renderTags();

    this.showMoreBtn.addEventListener('click', () => {
      this.showingAllEmails = !this.showingAllEmails;
      this.renderTags();
    });
  }

  setupEventListeners() {
    this.inputElement.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.addEmail();
      }
    });

    this.inputElement.addEventListener('paste', (e) => {
      e.preventDefault();
      const pastedText = e.clipboardData.getData('text');

      if (pastedText.includes(',') || pastedText.includes(';') || pastedText.includes('\n')) {
        const emails = pastedText.split(/[,;\n]/)
          .map(email => email.trim())
          .filter(email => email);

        emails.forEach(email => this.addEmailIfValid(email));
      } else {
        this.addEmailIfValid(pastedText.trim());
      }
    });

    this.inputElement.addEventListener('blur', () => {
      if (this.inputElement.value.trim()) {
        this.addEmail();
      }
    });
  }

  renderTags() {
    this.tagsContainer.innerHTML = '';

    const emailsToShow = this.showingAllEmails
      ? this.emails
      : this.emails.slice(0, this.maxDisplayedEmails);

    emailsToShow.forEach((email, index) => {
      const tag = document.createElement('span');
      tag.className = 'email-tag';
      tag.style.display = 'inline-block';
      tag.style.margin = '2px';
      tag.style.padding = '2px 4px';
      tag.style.border = '1px solid #ccc';
      tag.style.borderRadius = '3px';
      tag.style.background = '#f5f5f5';

      tag.innerHTML = `
        ${email}
        <button type="button" class="remove-tag btn-small" data-index="${index}" style="border: none; background: none; cursor: pointer; font-weight: bold; margin-left: 4px;">×</button>
      `;

      tag.querySelector('.remove-tag').addEventListener('click', () => {
        this.removeEmail(index);
      });

      this.tagsContainer.appendChild(tag);
    });

    if (this.emails.length > this.maxDisplayedEmails) {
      this.tagsMoreContainer.style.display = 'block';
      this.showMoreBtn.textContent = this.showingAllEmails
        ? 'Visa färre'
        : `Visa alla (${this.emails.length})`;
    } else {
      this.tagsMoreContainer.style.display = 'none';
    }
  }

  addEmail() {
    const email = this.inputElement.value.trim();
    if (this.addEmailIfValid(email)) {
      this.inputElement.value = '';
    }
  }

  addEmailIfValid(email) {
    if (!email) return false;

    if (this.validateEmail(email)) {
      if (!this.emails.includes(email)) {
        this.emails.push(email);
        this.renderTags();
        this.onChange(this.emails);
        this.feedbackElement.style.display = 'none';
        return true;
      } else {
        this.showError(`${email} har redan lagts till`);
        return false;
      }
    } else {
      this.showError(`${email} är inte en giltig e-postadress`);
      return false;
    }
  }

  removeEmail(index) {
    this.emails.splice(index, 1);
    this.renderTags();
    this.onChange(this.emails);
  }

  validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  showError(message) {
    this.feedbackElement.textContent = message;
    this.feedbackElement.style.display = 'block';
    setTimeout(() => {
      this.feedbackElement.style.display = 'none';
    }, 3000);
  }

  getEmails() {
    return [...this.emails];
  }

  addEmails(emailsArray) {
    emailsArray.forEach(email => this.addEmailIfValid(email));
  }

  clear() {
    this.emails = [];
    this.showingAllEmails = false;
    this.renderTags();
    this.onChange(this.emails);
  }
}