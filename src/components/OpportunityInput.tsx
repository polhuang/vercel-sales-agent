import React from 'react';
import { Box, Text } from 'ink';
import { TextInput } from '@inkjs/ui';

interface OpportunityInputProps {
  onSubmit: (opportunityId: string) => void;
}

export function OpportunityInput({ onSubmit }: OpportunityInputProps) {
  const handleSubmit = (value: string) => {
    if (value.trim()) {
      onSubmit(value.trim());
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        ╔════════════════════════════════════════════╗
      </Text>
      <Text bold color="cyan">
        ║   Select Salesforce Opportunity           ║
      </Text>
      <Text bold color="cyan">
        ╚════════════════════════════════════════════╝
      </Text>

      <Box marginTop={1}>
        <Text dimColor>Enter the Salesforce Opportunity ID (e.g., 006...)</Text>
      </Box>

      <Box marginTop={2}>
        <Text bold>Opportunity ID: </Text>
        <TextInput
          placeholder="006XXXXXXXXXXXXXXXXX"
          onSubmit={handleSubmit}
        />
      </Box>

      <Box marginTop={2}>
        <Text dimColor>Press Enter to continue</Text>
      </Box>
    </Box>
  );
}
