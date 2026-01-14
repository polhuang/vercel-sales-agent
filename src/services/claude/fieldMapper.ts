import { mapFieldName as configMapFieldName } from '../../config/salesforce.js';
import { FieldUpdate } from '../../types/opportunity.js';

export class FieldMapperService {
  /**
   * Map natural language field name to Salesforce API name
   */
  mapFieldName(naturalLanguage: string): string | null {
    return configMapFieldName(naturalLanguage);
  }

  /**
   * Map array of field updates, converting any natural language field names
   */
  mapFieldUpdates(updates: FieldUpdate[]): FieldUpdate[] {
    return updates.map(update => {
      // If field is already an API name (contains __c or is recognized), keep it
      if (update.field.includes('__c') || update.field === 'Amount' || update.field === 'CloseDate') {
        return update;
      }

      // Try to map from natural language
      const mappedField = this.mapFieldName(update.field);
      if (mappedField) {
        return {
          ...update,
          field: mappedField,
        };
      }

      // If no mapping found, return as-is with warning
      console.warn(`No mapping found for field: ${update.field}`);
      return update;
    });
  }

  /**
   * Validate field value based on field type
   */
  validateFieldValue(fieldName: string, value: any): boolean {
    // Amount should be numeric
    if (fieldName === 'Amount') {
      return typeof value === 'number' && value > 0;
    }

    // Date fields should be valid dates
    if (fieldName === 'CloseDate' || fieldName.includes('Date')) {
      if (typeof value === 'string') {
        const date = new Date(value);
        return !isNaN(date.getTime());
      }
      return false;
    }

    // Most other fields just need to be non-empty
    return value !== null && value !== undefined && value !== '';
  }
}
