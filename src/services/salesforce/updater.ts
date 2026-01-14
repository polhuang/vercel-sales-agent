import { AgentBrowserService } from './browser.js';
import { FieldUpdate } from '../../types/opportunity.js';

export class FieldUpdaterService {
  private browser: AgentBrowserService;

  constructor(browser: AgentBrowserService) {
    this.browser = browser;
  }

  /**
   * Update multiple fields in Salesforce
   */
  async updateFields(fieldUpdates: FieldUpdate[]): Promise<void> {
    for (const update of fieldUpdates) {
      await this.updateField(update.field, update.value);
      await this.browser.wait(500); // Small delay between updates
    }
  }

  /**
   * Update a single field
   */
  async updateField(fieldName: string, value: any): Promise<void> {
    const snapshot = await this.browser.getSnapshot();

    // Find the field by name
    let fieldRef: string | null = null;
    let fieldType: string | null = null;

    for (const [ref, element] of Object.entries(snapshot.data.refs)) {
      // Match by field name (case-insensitive)
      if (element.name?.toLowerCase().includes(fieldName.toLowerCase())) {
        fieldRef = ref;
        fieldType = element.role;
        break;
      }
    }

    if (!fieldRef) {
      console.warn(`Field not found: ${fieldName}`);
      return;
    }

    // Update based on field type
    switch (fieldType) {
      case 'textbox':
      case 'searchbox':
        await this.browser.fillField(`@${fieldRef}`, value.toString());
        break;

      case 'combobox':
        // For picklists, need to click and select
        await this.browser.clickElement(`@${fieldRef}`);
        await this.browser.wait(500);
        // Try to select by value
        await this.browser.fillField(`@${fieldRef}`, value.toString());
        break;

      case 'checkbox':
        // For checkboxes, click if value is true
        if (value === true || value === 'true') {
          await this.browser.clickElement(`@${fieldRef}`);
        }
        break;

      default:
        // Default to fill
        await this.browser.fillField(`@${fieldRef}`, value.toString());
    }
  }

  /**
   * Update stage field specifically
   */
  async updateStage(newStage: string): Promise<void> {
    const snapshot = await this.browser.getSnapshot();

    // Find stage picker
    for (const [ref, element] of Object.entries(snapshot.data.refs)) {
      if (element.name?.toLowerCase().includes('stage')) {
        await this.browser.clickElement(`@${ref}`);
        await this.browser.wait(500);

        // Find the stage option
        const updatedSnapshot = await this.browser.getSnapshot();
        for (const [optionRef, optionElement] of Object.entries(updatedSnapshot.data.refs)) {
          if (optionElement.name === newStage) {
            await this.browser.clickElement(`@${optionRef}`);
            return;
          }
        }
      }
    }

    throw new Error(`Could not update stage to: ${newStage}`);
  }
}
