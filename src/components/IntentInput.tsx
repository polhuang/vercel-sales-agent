import React from 'react';
import { Box, Text } from 'ink';
import { TextInput } from '@inkjs/ui';

interface IntentInputProps {
  onSubmit: (intent: string) => void;
}

export function IntentInput({ onSubmit }: IntentInputProps) {
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
        ║   What would you like to do?              ║
      </Text>
      <Text bold color="cyan">
        ╚════════════════════════════════════════════╝
      </Text>

      <Box marginTop={1}>
        <Text dimColor>Describe what you want to do in natural language:</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text color="green">Examples:</Text>
        <Text dimColor>• "Update the Tribute Technology opp, moving it to stage 2"</Text>
        <Text dimColor>• "Create a new opportunity for Acme Corp, $50k deal"</Text>
        <Text dimColor>• "Update Bilt Rewards opportunity with call notes: [paste notes]"</Text>
      </Box>

      <Box marginTop={2}>
        <Text bold>Your request: </Text>
      </Box>
      <Box marginTop={1}>
        <TextInput
          placeholder="I want to..."
          onSubmit={handleSubmit}
        />
      </Box>

      <Box marginTop={2}>
        <Text dimColor>Press Enter to continue</Text>
      </Box>
    </Box>
  );
}
