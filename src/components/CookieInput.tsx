import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { TextInput } from '@inkjs/ui';
import { SalesforceCookies } from '../types/cookies.js';

interface CookieInputProps {
  onSubmit: (cookies: SalesforceCookies) => void;
}

export function CookieInput({ onSubmit }: CookieInputProps) {
  const [currentField, setCurrentField] = useState<'sid' | 'oid' | 'clientSrc' | 'sid_Client' | 'done'>('sid');
  const [sid, setSid] = useState('');
  const [oid, setOid] = useState('');
  const [clientSrc, setClientSrc] = useState('');
  const [sidClient, setSidClient] = useState('');

  const handleSubmit = (value: string) => {
    if (currentField === 'sid') {
      setSid(value);
      setCurrentField('oid');
    } else if (currentField === 'oid') {
      setOid(value);
      setCurrentField('clientSrc');
    } else if (currentField === 'clientSrc') {
      setClientSrc(value);
      setCurrentField('sid_Client');
    } else if (currentField === 'sid_Client') {
      setSidClient(value);
      // Submit all cookies
      onSubmit({
        sid,
        oid: oid || undefined,
        clientSrc: clientSrc || undefined,
        sid_Client: sidClient || undefined,
      });
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        ╔════════════════════════════════════════════╗
      </Text>
      <Text bold color="cyan">
        ║   Salesforce Cookie Authentication        ║
      </Text>
      <Text bold color="cyan">
        ╚════════════════════════════════════════════╝
      </Text>

      <Box marginTop={1}>
        <Text dimColor>Extract these from Chrome DevTools → Application → Cookies</Text>
      </Box>

      <Box marginTop={2} flexDirection="column">
        <Box key="sid-field">
          <Text color={currentField === 'sid' ? 'green' : 'gray'}>
            {currentField === 'sid' ? '→ ' : '  '}
          </Text>
          <Text bold color={sid ? 'green' : currentField === 'sid' ? 'yellow' : 'white'}>
            [*] sid (required):{' '}
          </Text>
          {currentField === 'sid' ? (
            <TextInput
              placeholder="00D6g000000Cnx9!AQEAQ..."
              onSubmit={handleSubmit}
            />
          ) : (
            <Text color="green">{sid ? '✓' : ''}</Text>
          )}
        </Box>

        <Box marginTop={1} key="oid-field">
          <Text color={currentField === 'oid' ? 'green' : 'gray'}>
            {currentField === 'oid' ? '→ ' : '  '}
          </Text>
          <Text color={oid ? 'green' : currentField === 'oid' ? 'yellow' : 'white'}>
            [ ] oid (optional):{' '}
          </Text>
          {currentField === 'oid' ? (
            <TextInput
              placeholder="00D6g000000Cnx9 (press Enter to skip)"
              onSubmit={handleSubmit}
            />
          ) : (
            <Text color="green">{oid ? '✓' : ''}</Text>
          )}
        </Box>

        <Box marginTop={1} key="clientSrc-field">
          <Text color={currentField === 'clientSrc' ? 'green' : 'gray'}>
            {currentField === 'clientSrc' ? '→ ' : '  '}
          </Text>
          <Text color={clientSrc ? 'green' : currentField === 'clientSrc' ? 'yellow' : 'white'}>
            [ ] clientSrc (optional):{' '}
          </Text>
          {currentField === 'clientSrc' ? (
            <TextInput
              placeholder="192.168.1.100 (press Enter to skip)"
              onSubmit={handleSubmit}
            />
          ) : (
            <Text color="green">{clientSrc ? '✓' : ''}</Text>
          )}
        </Box>

        <Box marginTop={1} key="sid_Client-field">
          <Text color={currentField === 'sid_Client' ? 'green' : 'gray'}>
            {currentField === 'sid_Client' ? '→ ' : '  '}
          </Text>
          <Text color={sidClient ? 'green' : currentField === 'sid_Client' ? 'yellow' : 'white'}>
            [ ] sid_Client (optional):{' '}
          </Text>
          {currentField === 'sid_Client' ? (
            <TextInput
              placeholder="Z000005Srkrg000000Cnx9 (press Enter to skip)"
              onSubmit={handleSubmit}
            />
          ) : (
            <Text color="green">{sidClient ? '✓' : ''}</Text>
          )}
        </Box>
      </Box>

      <Box marginTop={2}>
        <Text dimColor>Press Enter after each field (leave blank to skip optional fields)</Text>
      </Box>
    </Box>
  );
}
