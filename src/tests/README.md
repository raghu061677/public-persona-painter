# Go-Ads 360° Test Suite

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test CompanyProfile.test.tsx
```

## Test Structure

```
src/tests/
├── unit/              # Unit tests for utilities and helpers
├── pages/             # Page component tests
├── integration/       # Integration and flow tests
├── utils/             # Test utilities and helpers
└── setup.ts          # Test configuration
```

## Test Coverage

### Settings Pages
- ✅ CompanyProfile - Profile data loading, validation, and saving
- ✅ CompanyBranding - Logo upload, color validation, and branding saves
- ✅ CompanySales - Sales settings, numeric validation, and toggles

### Integration Tests
- ✅ Settings Flow - Cross-page data persistence
- ✅ Concurrent Updates - Multi-user edit handling
- ✅ Data Integrity - Cross-settings validation
- ✅ Error Handling - Network and database errors
- ✅ State Management - Form state during navigation

## Test Patterns

### Mocking Supabase
```typescript
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
      }),
    }),
  },
}));
```

### Testing User Interactions
```typescript
const input = screen.getByLabelText(/company name/i);
fireEvent.change(input, { target: { value: 'New Name' } });

const button = screen.getByRole('button', { name: /save/i });
fireEvent.click(button);

await waitFor(() => {
  expect(screen.getByText(/saved successfully/i)).toBeInTheDocument();
});
```

### Testing Async Operations
```typescript
await waitFor(() => {
  expect(mockUpdate).toHaveBeenCalled();
}, { timeout: 3000 });
```

## Best Practices

1. **Arrange-Act-Assert**: Structure tests clearly
2. **Mock External Dependencies**: Supabase, APIs, storage
3. **Test User Behavior**: Focus on what users do, not implementation
4. **Use Semantic Queries**: `getByRole`, `getByLabelText` over `getByTestId`
5. **Test Edge Cases**: Empty states, errors, validation
6. **Keep Tests Isolated**: Each test should be independent

## Adding New Tests

1. Create test file next to the component or in appropriate test folder
2. Import test utilities from `../utils/test-utils`
3. Mock Supabase and context providers
4. Write descriptive test names
5. Test happy path and edge cases
6. Run tests to ensure they pass

## Coverage Goals

- Unit Tests: 80%+ coverage
- Page Components: 70%+ coverage
- Integration Tests: Key user flows covered
- E2E Tests: Critical business workflows

## Continuous Integration

Tests run automatically on:
- Pull requests
- Main branch commits
- Pre-deployment checks

## Troubleshooting

### Tests Timing Out
- Increase `timeout` in `waitFor`
- Check for unresolved promises
- Verify mocks return resolved values

### Tests Failing Randomly
- Check for race conditions
- Ensure proper cleanup in `beforeEach`
- Use `waitFor` for async operations

### Mock Not Working
- Verify mock path matches import
- Check mock is defined before test runs
- Use `vi.clearAllMocks()` in `beforeEach`
