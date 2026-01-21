import React from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput } from '@inkjs/ui';

interface ManualCookieInputProps {
  onSubmit: (sid: string) => void;
  onSkip: () => void;
}

export function ManualCookieInput({ onSubmit, onSkip }: ManualCookieInputProps) {
  useInput((input, key) => {
    if (key.escape || input === 's') {
      // Press 's' or ESC to skip and use browser login
      onSkip();
    }
  });

  const handleSubmit = (value: string) => {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      // Empty input, skip to browser login
      onSkip();
      return;
    }

    onSubmit(trimmedValue);
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        ╔════════════════════════════════════════════╗
      </Text>
      <Text bold color="cyan">
        ║   Salesforce Authentication                ║
      </Text>
      <Text bold color="cyan">
        ╚════════════════════════════════════════════╝
      </Text>

      <Box marginTop={1}>
        <Text>
          You can authenticate by providing your Salesforce SID cookie or use browser login.
        </Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text bold color="yellow">Option 1: Manual SID Cookie</Text>
        <Text dimColor>
          If you have a Salesforce SID cookie, paste it below and press Enter.
        </Text>
      </Box>

      <Box marginTop={1}>
        <TextInput
          placeholder="Paste your SID cookie here (or press 's' to skip)..."
          onSubmit={handleSubmit}
        />
      </Box>

      <Box marginTop={2} flexDirection="column">
        <Text bold color="yellow">Option 2: Browser Login</Text>
        <Text dimColor>
          Press 's' or Enter with empty input to launch browser for Okta login.
        </Text>
      </Box>

      <Box marginTop={2}>
        <Text dimColor>
          Press Enter to submit • Press 's' or ESC to skip • Press Ctrl+C to cancel
        </Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text bold>How to find your SID cookie:</Text>
        <Text dimColor>1. Open Salesforce in your browser</Text>
        <Text dimColor>2. Open Developer Tools (F12)</Text>
        <Text dimColor>3. Go to Application/Storage → Cookies</Text>
        <Text dimColor>4. Find the 'sid' cookie and copy its value</Text>
      </Box>
    </Box>
  );
}
