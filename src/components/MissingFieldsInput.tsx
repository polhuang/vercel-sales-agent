import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { TextInput } from '@inkjs/ui';

interface MissingField {
  apiName: string;
  displayName: string;
  description: string;
}

interface MissingFieldsInputProps {
  missingFields: MissingField[];
  onSubmit: (fieldValues: Record<string, string>) => void;
  onCancel: () => void;
}

export function MissingFieldsInput({ missingFields, onSubmit, onCancel }: MissingFieldsInputProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});

  const currentField = missingFields[currentIndex];
  const isLastField = currentIndex === missingFields.length - 1;

  const handleSubmit = (value: string) => {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      // Allow skipping by pressing enter without value
      return;
    }

    const newValues = { ...values, [currentField.apiName]: trimmedValue };
    setValues(newValues);

    if (isLastField) {
      // All fields collected, submit
      onSubmit(newValues);
    } else {
      // Move to next field
      setCurrentIndex(currentIndex + 1);
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        ╔════════════════════════════════════════════╗
      </Text>
      <Text bold color="cyan">
        ║   Required Fields Missing                 ║
      </Text>
      <Text bold color="cyan">
        ╚════════════════════════════════════════════╝
      </Text>

      <Box marginTop={1}>
        <Text>
          To proceed with the stage change, please provide the following required fields:
        </Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text bold color="yellow">Missing Fields ({missingFields.length}):</Text>
        {missingFields.map((field, idx) => (
          <Text key={field.apiName} color={idx === currentIndex ? 'green' : 'dim'}>
            {idx === currentIndex ? '→ ' : '  '}
            {idx < currentIndex ? '✓ ' : ''}
            {field.displayName} - {field.description}
          </Text>
        ))}
      </Box>

      <Box marginTop={2} flexDirection="column">
        <Text bold>
          [{currentIndex + 1}/{missingFields.length}] {currentField.displayName}:
        </Text>
        <Text dimColor>{currentField.description}</Text>
      </Box>

      <Box marginTop={1}>
        <TextInput
          placeholder={`Enter ${currentField.displayName.toLowerCase()}...`}
          onSubmit={handleSubmit}
        />
      </Box>

      <Box marginTop={2}>
        <Text dimColor>
          Press Enter to {isLastField ? 'submit' : 'continue'} • Press Ctrl+C to cancel
        </Text>
      </Box>

      {Object.keys(values).length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold>Values entered so far:</Text>
          {Object.entries(values).map(([key, value]) => {
            const field = missingFields.find(f => f.apiName === key);
            return (
              <Text key={key} color="green">
                ✓ {field?.displayName}: {value}
              </Text>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
