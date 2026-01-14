export class FieldValidator {
  /**
   * Validate field value based on field type/name
   */
  validate(fieldName: string, value: any): { valid: boolean; error?: string } {
    // Amount validation
    if (fieldName === 'Amount') {
      if (typeof value !== 'number' || value <= 0) {
        return { valid: false, error: 'Amount must be a positive number' };
      }
    }

    // Date validation
    if (fieldName === 'CloseDate' || fieldName.includes('Date__c')) {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return { valid: false, error: 'Invalid date format' };
      }
      // Check if date is in the future for CloseDate
      if (fieldName === 'CloseDate' && date < new Date()) {
        return { valid: false, error: 'Close date must be in the future' };
      }
    }

    // URL validation
    if (fieldName.includes('URL')) {
      try {
        new URL(value);
      } catch {
        return { valid: false, error: 'Invalid URL format' };
      }
    }

    // Email validation (basic)
    if (fieldName.includes('Email')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return { valid: false, error: 'Invalid email format' };
      }
    }

    // All other fields just need to be non-empty
    if (value === null || value === undefined || value === '') {
      return { valid: false, error: 'Field cannot be empty' };
    }

    return { valid: true };
  }

  /**
   * Validate multiple fields
   */
  validateMultiple(fields: Record<string, any>): Record<string, string> {
    const errors: Record<string, string> = {};

    for (const [fieldName, value] of Object.entries(fields)) {
      const result = this.validate(fieldName, value);
      if (!result.valid && result.error) {
        errors[fieldName] = result.error;
      }
    }

    return errors;
  }
}
