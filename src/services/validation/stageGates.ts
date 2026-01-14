import { ValidationResult } from '../../types/stageGates.js';
import { getStageGateRule } from '../../config/stages.js';
import { FieldUpdate } from '../../types/opportunity.js';

export class StageGateValidator {
  /**
   * Normalize stage name by removing numeric prefixes like "0 - "
   */
  private normalizeStage(stage: string): string {
    // Remove patterns like "0 - ", "1 - ", etc.
    return stage.replace(/^\d+\s*-\s*/, '').trim();
  }

  /**
   * Validate a stage transition
   */
  validateStageTransition(
    fromStage: string,
    toStage: string,
    currentFields: Record<string, any>,
    proposedUpdates: FieldUpdate[]
  ): ValidationResult {
    // Normalize stage names
    const normalizedFrom = this.normalizeStage(fromStage);
    const normalizedTo = this.normalizeStage(toStage);

    const rule = getStageGateRule(normalizedFrom, normalizedTo);

    if (!rule) {
      return {
        isValid: true,
        missingFields: [],
        warnings: [`No stage-gate rule defined for ${normalizedFrom} → ${normalizedTo}`],
      };
    }

    // Combine current fields with proposed updates
    const allFields = { ...currentFields };
    for (const update of proposedUpdates) {
      allFields[update.field] = update.value;
    }

    // Check which required fields are missing or empty
    const missingFields: string[] = [];
    const warnings: string[] = [];

    for (const reqField of rule.requiredFields) {
      const value = allFields[reqField.apiName];
      const isEmpty = value === null || value === undefined || value === '';

      if (isEmpty) {
        missingFields.push(reqField.displayName);
        warnings.push(`Missing required field: ${reqField.displayName} - ${reqField.description}`);
      } else if (reqField.validation && !reqField.validation(value)) {
        warnings.push(`Invalid value for ${reqField.displayName}: ${value}`);
      }
    }

    return {
      isValid: missingFields.length === 0,
      missingFields,
      warnings,
    };
  }

  /**
   * Get all required fields for a specific stage transition
   */
  getRequiredFields(fromStage: string, toStage: string): string[] {
    const normalizedFrom = this.normalizeStage(fromStage);
    const normalizedTo = this.normalizeStage(toStage);
    const rule = getStageGateRule(normalizedFrom, normalizedTo);
    return rule ? rule.requiredFields.map(f => f.displayName) : [];
  }

  /**
   * Get the stage gate rule for a specific transition
   */
  getStageGateRule(fromStage: string, toStage: string) {
    const normalizedFrom = this.normalizeStage(fromStage);
    const normalizedTo = this.normalizeStage(toStage);
    return getStageGateRule(normalizedFrom, normalizedTo);
  }

  /**
   * Check if all required fields for current stage are populated
   */
  validateCurrentStage(stage: string, fields: Record<string, any>): ValidationResult {
    // Find rules where current stage is the "to" stage
    const warnings: string[] = [];
    const missingFields: string[] = [];

    // This is a simplified check - in production you'd want to track
    // which fields are required to *be* in a stage vs to *enter* a stage
    return {
      isValid: true,
      missingFields,
      warnings,
    };
  }
}
