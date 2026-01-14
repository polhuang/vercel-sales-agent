import React from 'react';
import { Box, Text } from 'ink';
import { Select } from '@inkjs/ui';
import { OpportunitySearchResult } from '../services/salesforce/search.js';

interface OpportunitySelectorProps {
  opportunities: OpportunitySearchResult[];
  onSelect: (opportunity: OpportunitySearchResult) => void;
}

export function OpportunitySelector({ opportunities, onSelect }: OpportunitySelectorProps) {
  const options = opportunities.map((opp) => ({
    label: opp.name,
    value: opp.id,
  }));

  const handleChange = (value: string) => {
    const selected = opportunities.find((opp) => opp.id === value);
    if (selected) {
      onSelect(selected);
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        Multiple opportunities found:
      </Text>
      <Box marginTop={1}>
        <Text dimColor>Found {opportunities.length} matching opportunities. Select one to continue:</Text>
      </Box>
      <Box marginTop={2}>
        <Select
          options={options}
          onChange={handleChange}
          visibleOptionCount={Math.min(10, opportunities.length)}
        />
      </Box>
      <Box marginTop={2}>
        <Text dimColor>Use ↑/↓ arrows to navigate, Enter to select, Ctrl+C to exit</Text>
      </Box>
    </Box>
  );
}
