import { AgentBrowserService } from './browser.js';
import { FieldUpdate } from '../../types/opportunity.js';
import { logger } from '../../utils/logger.js';

export class FieldUpdaterService {
  private browser: AgentBrowserService;

  constructor(browser: AgentBrowserService) {
    this.browser = browser;
  }

  /**
   * Save changes by clicking the Save button
   */
  async saveChanges(): Promise<void> {
    const snapshot = await this.browser.getSnapshot();

    // Find Save button
    for (const [ref, element] of Object.entries(snapshot.data.refs)) {
      const name = element.name?.toString().toLowerCase() || '';
      const role = element.role?.toString() || '';

      if (role === 'button' && name === 'save') {
        logger.info('Clicking Save button');
        await this.browser.clickElement(`@${ref}`);
        await this.browser.wait(2000); // Wait for save to complete
        return;
      }
    }

    logger.warn('Save button not found - changes may not be saved');
  }

  /**
   * Ensure we're in edit mode by clicking the Edit button if needed
   */
  async ensureEditMode(): Promise<void> {
    const snapshot = await this.browser.getSnapshot();

    // Look for Edit button
    for (const [ref, element] of Object.entries(snapshot.data.refs)) {
      const name = element.name?.toString().toLowerCase() || '';
      const role = element.role?.toString() || '';

      if (role === 'button' && name === 'edit') {
        logger.info('Clicking Edit button to enter edit mode');
        await this.browser.clickElement(`@${ref}`);
        await this.browser.wait(3000); // Wait longer for edit mode to fully activate
        return;
      }
    }

    logger.info('Edit button not found - assuming already in edit mode');
  }

  /**
   * Update multiple fields in Salesforce
   */
  async updateFields(fieldUpdates: FieldUpdate[]): Promise<void> {
    // Ensure we're in edit mode first
    await this.ensureEditMode();

    for (const update of fieldUpdates) {
      await this.updateField(update.field, update.value);
      await this.browser.wait(500); // Small delay between updates
    }
  }

  /**
   * Update a single field
   */
  async updateField(fieldName: string, value: any): Promise<void> {
    logger.info('Attempting to update field', { fieldName, value });

    // Map API field names to user-friendly names that appear in Salesforce UI
    const fieldDisplayNames: Record<string, string[]> = {
      'Amount': ['amount'],
      'Primary_Contact__c': ['primary contact'],
      'CloseDate': ['close date'],
      'Champion__c': ['champion'],
      'NextStep': ['next step'],
      'Implicated_Pain__c': ['implicate pain'],
    };

    const possibleNames = fieldDisplayNames[fieldName] || [fieldName.toLowerCase().replace(/__c$/, '').replace(/_/g, ' ')];

    // Try multiple times to find and update the field
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        logger.info(`Retry attempt ${attempt + 1} for field ${fieldName}`);

        // On retry, try scrolling down to reveal more fields
        if (attempt === 1) {
          logger.info('Scrolling down to reveal more fields');
          await this.browser.exec('scroll', ['down', '500']);
          await this.browser.wait(2000); // Wait longer after scrolling
        } else {
          await this.browser.wait(1000);
        }
      }

      // Get fresh snapshot
      const snapshot = await this.browser.getSnapshot();

      // Find the field by name with multiple matching strategies
      let fieldRef: string | null = null;
      let fieldType: string | null = null;

      // First pass: log all input fields for debugging
      if (attempt === 0) {
        logger.debug(`Looking for field "${fieldName}", trying names: ${possibleNames.join(', ')}`);
        const inputFields: Array<{ name: string; role: string; ref: string }> = [];
        for (const [ref, element] of Object.entries(snapshot.data.refs)) {
          const role = element.role?.toString() || '';
          if (['textbox', 'searchbox', 'combobox', 'checkbox', 'spinbutton'].includes(role)) {
            inputFields.push({
              name: element.name?.toString() || 'unnamed',
              role,
              ref
            });
          }
        }
        logger.debug(`Total input fields found: ${inputFields.length}`, {
          first30Fields: inputFields.slice(0, 30).map(f => `${f.name} (${f.role})`)
        });
      }

      for (const [ref, element] of Object.entries(snapshot.data.refs)) {
        const elementName = element.name?.toString().toLowerCase() || '';
        const role = element.role?.toString() || '';

        // Skip non-input elements
        if (!['textbox', 'searchbox', 'combobox', 'checkbox', 'spinbutton'].includes(role)) {
          continue;
        }

        // Try matching against possible names with priority order:
        // 1. Exact match (most specific)
        // 2. Word boundary match
        // 3. Contains match (least specific)
        for (const possibleName of possibleNames) {
          let matched = false;

          // Priority 1: Try exact match (case-insensitive)
          if (elementName === possibleName) {
            fieldRef = ref;
            fieldType = role;
            matched = true;
            logger.info('Found field element (exact match)', {
              fieldName,
              searchTerm: possibleName,
              elementName: element.name,
              role,
              ref
            });
            break;
          }
        }

        // Priority 2: If no exact match, try word boundary match
        if (!fieldRef) {
          for (const possibleName of possibleNames) {
            const words = elementName.split(/[\s\-_*()]+/);
            if (words.some(word => word === possibleName)) {
              fieldRef = ref;
              fieldType = role;
              logger.info('Found field element (word boundary match)', {
                fieldName,
                searchTerm: possibleName,
                elementName: element.name,
                role,
                ref,
                words: words.slice(0, 5)
              });
              break;
            }
          }
        }

        // Priority 3: If still no match, try partial contains (most lenient)
        if (!fieldRef) {
          for (const possibleName of possibleNames) {
            if (elementName.includes(possibleName)) {
              fieldRef = ref;
              fieldType = role;
              logger.info('Found field element (contains match)', {
                fieldName,
                searchTerm: possibleName,
                elementName: element.name,
                role,
                ref
              });
              break;
            }
          }
        }

        if (fieldRef) break;
      }

      if (!fieldRef) {
        // Log all input fields we can see for debugging
        const availableFields: string[] = [];
        for (const [ref, element] of Object.entries(snapshot.data.refs)) {
          const role = element.role?.toString() || '';
          if (['textbox', 'searchbox', 'combobox', 'checkbox', 'spinbutton'].includes(role)) {
            availableFields.push(element.name?.toString() || 'unnamed');
          }
        }

        logger.warn(`Field not found on attempt ${attempt + 1}: ${fieldName}`, {
          possibleNames,
          totalElements: Object.keys(snapshot.data.refs).length,
          totalInputFields: availableFields.length,
          allFields: availableFields // Log ALL fields to help debug
        });
        continue;
      }

      // Update based on field type
      try {
        switch (fieldType) {
          case 'textbox':
          case 'searchbox':
          case 'spinbutton':
            await this.browser.fillField(`@${fieldRef}`, value.toString());
            logger.info('Successfully filled field', { fieldName, value });
            return;

          case 'combobox':
            // For comboboxes and lookup fields, need to click, type to search, and select from dropdown
            logger.info('Opening combobox dropdown', { fieldName, value });
            await this.browser.clickElement(`@${fieldRef}`);
            await this.browser.wait(500);

            // Type the value to search/filter
            await this.browser.fillField(`@${fieldRef}`, value.toString());
            await this.browser.wait(1000); // Wait for dropdown options to appear

            // Get fresh snapshot to see dropdown options
            const dropdownSnapshot = await this.browser.getSnapshot();

            // Look for matching option in dropdown
            let optionFound = false;
            const searchValue = value.toString().toLowerCase();

            for (const [optionRef, optionElement] of Object.entries(dropdownSnapshot.data.refs)) {
              const optionRole = optionElement.role?.toString() || '';
              const optionName = optionElement.name?.toString() || '';

              // Look for option or menuitem roles
              if ((optionRole === 'option' || optionRole === 'menuitem') && optionName.toLowerCase().includes(searchValue)) {
                logger.info('Found matching dropdown option', { fieldName, optionName, optionRef });
                await this.browser.clickElement(`@${optionRef}`);
                await this.browser.wait(500);
                optionFound = true;
                break;
              }
            }

            if (optionFound) {
              logger.info('Successfully selected from combobox', { fieldName, value });
              return;
            } else {
              logger.warn('No matching option found in dropdown, field may still be filled', { fieldName, value });
              // Don't throw error, the value might have been filled even if we didn't select from dropdown
              return;
            }

          case 'checkbox':
            // For checkboxes, click if value is true
            if (value === true || value === 'true') {
              await this.browser.clickElement(`@${fieldRef}`);
              logger.info('Successfully checked checkbox', { fieldName });
            }
            return;

          default:
            await this.browser.fillField(`@${fieldRef}`, value.toString());
            logger.info('Successfully filled field (default)', { fieldName, value });
            return;
        }
      } catch (error: any) {
        logger.warn(`Failed to update field on attempt ${attempt + 1}`, {
          fieldName,
          error: error.message
        });
      }
    }

    logger.error(`Could not update field after all attempts: ${fieldName}`);
    throw new Error(`Could not find or update field: ${fieldName}`);
  }

  /**
   * Update stage field specifically
   */
  async updateStage(newStage: string): Promise<void> {
    const snapshot = await this.browser.getSnapshot();

    // Normalize stage name - remove numeric prefixes
    const normalizedStage = newStage.replace(/^\d+\s*-\s*/, '').trim();

    logger.info('Looking for stage picker');

    // Find stage picker (button or combobox)
    // Look for element whose name matches stage pattern like "0 - Prospect", "1 - Qualification"
    let stageRef: string | null = null;
    for (const [ref, element] of Object.entries(snapshot.data.refs)) {
      const name = element.name?.toString() || '';
      const role = element.role?.toString() || '';

      // Look for stage picker button/combobox with pattern like "0 - Prospect"
      // Avoid matching fields like "Stage 1 Date Stamp" by checking for the dash pattern
      const hasStagePattern = /^\d+\s*-\s*[A-Za-z]/.test(name);

      if ((role === 'button' || role === 'combobox') && hasStagePattern) {
        stageRef = ref;
        logger.info('Found stage picker', { name, role, ref });
        break;
      }
    }

    // If not found with strict pattern, try fallback
    if (!stageRef) {
      logger.warn('Stage picker not found with pattern, trying fallback');
      for (const [ref, element] of Object.entries(snapshot.data.refs)) {
        const name = element.name?.toString().toLowerCase() || '';
        const role = element.role?.toString() || '';

        // Fallback: look for "stage" but exclude "date" and "stamp"
        if ((role === 'button' || role === 'combobox') &&
            name.includes('stage') &&
            !name.includes('date') &&
            !name.includes('stamp')) {
          stageRef = ref;
          logger.info('Found stage picker (fallback)', { name, role, ref });
          break;
        }
      }
    }

    if (!stageRef) {
      throw new Error('Could not find stage field');
    }

    // Click the stage picker
    logger.info('Clicking stage picker', { stageRef, normalizedStage });
    await this.browser.clickElement(`@${stageRef}`);
    await this.browser.wait(2000); // Wait longer for dropdown to appear

    // Find the stage option in the dropdown
    const updatedSnapshot = await this.browser.getSnapshot();

    // Log all available options for debugging
    const availableOptions: Array<{ name: string; role: string; normalized: string }> = [];
    for (const [ref, element] of Object.entries(updatedSnapshot.data.refs)) {
      const role = element.role?.toString() || '';
      if (role === 'option' || role === 'menuitem') {
        const name = element.name?.toString() || '';
        const normalized = name.replace(/^\d+\s*-\s*/, '').trim();
        availableOptions.push({ name, role, normalized });
      }
    }

    logger.debug('Available stage options in dropdown', {
      totalOptions: availableOptions.length,
      options: availableOptions.slice(0, 10),
      lookingFor: normalizedStage
    });

    for (const [optionRef, optionElement] of Object.entries(updatedSnapshot.data.refs)) {
      const optionName = optionElement.name?.toString() || '';
      const optionRole = optionElement.role?.toString() || '';

      // Match by normalized name
      const normalizedOption = optionName.replace(/^\d+\s*-\s*/, '').trim();

      if ((optionRole === 'option' || optionRole === 'menuitem') &&
          normalizedOption.toLowerCase() === normalizedStage.toLowerCase()) {
        logger.info('Found matching stage option', { optionName, normalizedOption, optionRef });
        await this.browser.clickElement(`@${optionRef}`);
        await this.browser.wait(500);
        return;
      }
    }

    logger.error('Could not find stage option', {
      lookingFor: normalizedStage,
      availableOptions: availableOptions.map(o => o.name)
    });
    throw new Error(`Could not find stage option: ${normalizedStage} in dropdown`);
  }
}
