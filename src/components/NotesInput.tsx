import React from 'react';
import { Box, Text } from 'ink';
import { TextInput } from '@inkjs/ui';

interface NotesInputProps {
  opportunityName: string;
  onSubmit: (notes: string) => void;
}

export function NotesInput({ opportunityName, onSubmit }: NotesInputProps) {
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
        ║   Enter Call Notes                        ║
      </Text>
      <Text bold color="cyan">
        ╚════════════════════════════════════════════╝
      </Text>

      <Box marginTop={1}>
        <Text>Opportunity: <Text bold color="green">{opportunityName}</Text></Text>
      </Box>

      <Box marginTop={2}>
        <Text dimColor>Enter your call notes in natural language:</Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Example: "Had call with CTO. Deal size is $75k. Main pain point is slow deployments."</Text>
      </Box>

      <Box marginTop={2}>
        <Text bold>Notes: </Text>
      </Box>
      <Box marginTop={1}>
        <TextInput
          placeholder="Enter call notes..."
          onSubmit={handleSubmit}
        />
      </Box>

      <Box marginTop={2}>
        <Text dimColor>Press Enter when done</Text>
      </Box>
    </Box>
  );
}
