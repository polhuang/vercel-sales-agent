import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { TextInput } from '@inkjs/ui';
import { StartupData } from '../types/startup.js';

interface StartupInputProps {
  onSubmit: (startup: StartupData) => void;
  onCancel: () => void;
}

export function StartupInput({ onSubmit, onCancel }: StartupInputProps) {
  const [field, setField] = useState<'name' | 'url'>('name');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');

  const handleNameSubmit = (value: string) => {
    setName(value);
    setField('url');
  };

  const handleUrlSubmit = (value: string) => {
    setUrl(value);
    onSubmit({ name, url: value });
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        Enter Startup Information
      </Text>
      <Box marginTop={1}>
        <Text dimColor>Enter the startup details to process</Text>
      </Box>

      <Box marginTop={2} flexDirection="column">
        {field === 'name' ? (
          <>
            <Text>Startup Name:</Text>
            <Box marginTop={1}>
              <TextInput
                placeholder="e.g., Acme Inc"
                onSubmit={handleNameSubmit}
              />
            </Box>
          </>
        ) : (
          <>
            <Text>
              <Text color="green">Startup Name: </Text>
              <Text>{name}</Text>
            </Text>
            <Box marginTop={1}>
              <Text>Startup Website URL:</Text>
            </Box>
            <Box marginTop={1}>
              <TextInput
                placeholder="e.g., https://acme.com"
                onSubmit={handleUrlSubmit}
              />
            </Box>
          </>
        )}
      </Box>

      <Box marginTop={2}>
        <Text dimColor>Press Ctrl+C to cancel and return to menu</Text>
      </Box>
    </Box>
  );
}
