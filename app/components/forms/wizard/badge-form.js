import Component from '@ember/component';
import { computed, observer } from '@ember/object';
import FormMixin from 'open-event-frontend/mixins/form';
import EventWizardMixin from 'open-event-frontend/mixins/event-wizard';
import { sortBy, union } from 'lodash-es';
import { badgeSize } from 'open-event-frontend/utils/dictionary/badge-image-size';
import { htmlSafe } from '@ember/template';
import tinycolor from 'tinycolor2';
import { badgeCustomFields } from 'open-event-frontend/utils/dictionary/badge-custom-fields';

export default Component.extend(FormMixin, EventWizardMixin, {
  currentSelected   : [],
  ignoreCustomField : [],
  isExpandedBadge   : true,
  init() {
    this._super(...arguments);
    this.removeBadgeField = this.removeBadgeField.bind(this);
    this.currentSelected = this.data.ticketsDetails;
    this.badgeForms = this.data.badgeForms;
  },

  ticketsEnable: computed('tickets', 'ticketsDetails', function() {
    return union(this.tickets || [], this.data.ticketsDetails || []);
  }),

  fixedFields: computed('data.customForms.@each', function() {
    return this.data.customForms?.filter(field => field.isFixed);
  }),

  badgeFields: computed('badgeForms.badgeFields.@each.isDeleted', function() {
    return this.badgeForms.badgeFields?.filter(field => !field.isDeleted);
  }),

  includeCustomField: computed('ignoreCustomField.@each', 'data.ticketsDetails.@each', function() {
    return this.customFormsValid.filter(item => !this.ignoreCustomField.includes(item));
  }),

  customFormsValid: computed('data.ticketsDetails.@each', function() {
    const formIds = this.data.ticketsDetails.map(item => item.formID);
    const validForms = this.customForms.filter(form => (formIds.includes(form.formID) && form.isIncluded) || form.isFixed).map(form => form.name);
    validForms.push('QR');
    return union(sortBy(validForms));
  }),

  getSelectedField: computed('data.ticketsDetails.@each', function() {
    // return sortBy(this.data.badgeFields.filter(field => !field.is_deleted && field.custom_field !== 'QR').map(field => field.custom_field));
    const formIds = this.data.ticketsDetails.map(item => item.formID);
    const validForms = this.customForms.filter(form => (formIds.includes(form.formID) && form.isIncluded) || form.isFixed).map(form => form.name);
    return union(sortBy(validForms));
  }),

  ticketNames: computed('data.ticketsDetails.@each', function() {
    let ticketNames = '';
    this.data.ticketsDetails.forEach(ticket => {
      if (ticketNames) {
        ticketNames += ', ' + ticket.name;
      } else {
        ticketNames = ticket.name;
      }
    });
    return ticketNames.trim();
  }),

  selectChanges: observer('data.ticketsDetails', function() {
    const { ticketsDetails } = this.data;
    const { currentSelected } = this;

    const added = currentSelected.length < ticketsDetails.length;
    let changed = [];
    if (added) {
      changed = ticketsDetails.filter(item => !currentSelected.includes(item));
    } else {
      changed = currentSelected.filter(item => !ticketsDetails.includes(item));
    }
    this.currentSelected = ticketsDetails;
    this.get('onFormUpdateTicket')({
      added,
      changed,
      formID: this.id
    });
  }),

  editableFields: computed('data.customForms.@each', function() {
    const filteredFields = this.data.customForms?.filter(field => !field.isFixed);
    const fields = sortBy(filteredFields, ['isComplex', 'name']);
    return sortBy(fields, ['position']);
  }),

  revertChanges: observer('data.event.isTicketFormEnabled', function() {
    if (!this.event.isTicketFormEnabled) {
      this.editableFields.forEach(field => field.set('isRequired', false));
    }
  }),

  showEditColumn: computed('editableFields.@each', function() {
    return this.editableFields?.some(field => field.isComplex);
  }),

  disableAddBadgeField: computed('data.badgeForms.badgeFields.@each.isDeleted', function() {
    return this.badgeForms.badgeFields?.filter(field => !field.isDeleted).length === badgeCustomFields.length;
  }),

  removeBadgeField(badgeField) {
    this.ignoreCustomField.removeObject(badgeField.customField);
  },

  onSelectedLanguage(old_code, new_code) {
    if (old_code) {
      this.ignoreCustomField.removeObject(old_code);
    }
    if (new_code) {
      this.ignoreCustomField.pushObject(new_code);
    }
  },

  getsampleData: computed('sampleData', function() {
    return {
      name         : 'Barack Obama',
      organisation : 'US',
      position     : 'President'
    };
  }),

  getBadgeSize: computed('badgeForms.badgeSize', 'badgeForms.badgeOrientation', function() {
    let height = 4;
    let lineHeight = 3;
    if (this.badgeForms.badgeSize) {
      [height, lineHeight] = [this.badgeForms.badgeSize.height, this.badgeForms.badgeSize.lineHeight];
    }
    if (this.badgeForms.badgeOrientation === 'Landscape') {
      [height, lineHeight] = [lineHeight, height];
    }

    return {
      height,
      lineHeight };
  }),

  getBadgeColor: computed('badgeForms.badgeColor', function() {
    return htmlSafe('background-color: ' + this.badgeForms.badgeColor);
  }),

  getBadgeImg: computed('badgeForms.badgeImageURL', function() {
    return htmlSafe('background-image: url(' + this.badgeForms.badgeImageURL + '); background-size: cover;');
  }),

  actions: {
    removeField(field) {
      field.deleteRecord();
    },
    addBadgeField() {
      this.badgeForms.badgeFields.pushObject(this.store.createRecord('badge-field-form', {
        badge_id   : this.data.badgeID,
        is_deleted : false,
        badgeCustomFields
      }));
    },
    mutateBadgeSize(value) {
      badgeSize.forEach(badge => {
        if (badge.name === value) {(this.badgeForms.badgeSize = badge)}
      });
    },
    mutateBadgeColor(color) {
      const colorCode = tinycolor(color.target.value);
      this.badgeForms.badgeColor = colorCode.toHexString();
    },
    onChildChangeCustomField(old_code, new_code) {
      this.onSelectedLanguage(old_code, new_code);
    },
    toggleBadge() {
      if (!this.isExpandedBadge) {
        this.set('isExpandedBadge', true);
      } else {
        this.set('isExpandedBadge', false);
      }
    },
    addCustomForm(customFormName) {
      if (!this.badgeForms.badgeQRFields.includes(customFormName)) {
        this.badgeForms.badgeQRFields.pushObject(customFormName);
      } else {
        this.badgeForms.badgeQRFields.removeObject(customFormName);
      }
    }
  }
});
