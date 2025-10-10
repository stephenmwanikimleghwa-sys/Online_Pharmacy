# Contributing to Transcounty Pharmacy Aggregator

Thank you for your interest in contributing to the Transcounty Pharmacy Aggregator! This document provides guidelines for contributing to the project.

## 🤝 How to Contribute

### 1. Fork and Clone
```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/yourusername/pharmacy-aggregator.git
cd pharmacy-aggregator
```

### 2. Set Up Development Environment
```bash
# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp env.example .env
# Edit .env with your configuration

# Frontend setup
cd ../frontend
npm install
```

### 3. Create a Branch
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 4. Make Your Changes
- Write clean, readable code
- Follow existing code style
- Add tests for new features
- Update documentation as needed

### 5. Test Your Changes
```bash
# Backend tests
cd backend
python manage.py test

# Frontend tests
cd ../frontend
npm test
```

### 6. Commit Your Changes
```bash
git add .
git commit -m "feat: add new prescription validation feature"
```

### 7. Push and Create Pull Request
```bash
git push origin feature/your-feature-name
# Then create a PR on GitHub
```

## 📋 Code Style Guidelines

### Python (Backend)
- Follow PEP 8
- Use type hints where appropriate
- Write docstrings for functions and classes
- Use meaningful variable names

### JavaScript/React (Frontend)
- Use ESLint configuration
- Follow React best practices
- Use functional components with hooks
- Implement proper error handling

### Git Commit Messages
Use conventional commit format:
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation
- `style:` for formatting
- `refactor:` for code refactoring
- `test:` for adding tests
- `chore:` for maintenance tasks

## 🧪 Testing Guidelines

### Backend Testing
```python
# Example test structure
class PrescriptionTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com'
        )
    
    def test_prescription_creation(self):
        # Test prescription creation logic
        pass
```

### Frontend Testing
```javascript
// Example component test
import { render, screen } from '@testing-library/react';
import PrescriptionCard from './PrescriptionCard';

test('renders prescription information', () => {
  const prescription = {
    id: 1,
    patient_name: 'John Doe',
    status: 'pending'
  };
  
  render(<PrescriptionCard prescription={prescription} />);
  expect(screen.getByText('John Doe')).toBeInTheDocument();
});
```

## 🐛 Reporting Issues

When reporting issues, please include:

1. **Clear description** of the problem
2. **Steps to reproduce** the issue
3. **Expected behavior** vs actual behavior
4. **Environment details** (OS, Python version, Node version)
5. **Screenshots** if applicable
6. **Error logs** if any

### Issue Template
```markdown
## Bug Report

**Description:**
A clear description of the bug.

**Steps to Reproduce:**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior:**
What should happen.

**Actual Behavior:**
What actually happens.

**Environment:**
- OS: [e.g. Ubuntu 20.04]
- Python: [e.g. 3.9.7]
- Node: [e.g. 16.14.0]
- Browser: [e.g. Chrome 91]

**Additional Context:**
Any other relevant information.
```

## ✨ Feature Requests

When requesting features, please include:

1. **Clear description** of the feature
2. **Use case** and benefits
3. **Proposed implementation** (if you have ideas)
4. **Screenshots/mockups** if applicable

### Feature Request Template
```markdown
## Feature Request

**Feature Description:**
A clear description of the feature you'd like to see.

**Use Case:**
Why is this feature needed? How would it benefit users?

**Proposed Implementation:**
Any ideas on how this could be implemented.

**Additional Context:**
Any other relevant information, mockups, or examples.
```

## 📚 Documentation

### Code Documentation
- Write clear docstrings for functions and classes
- Include type hints in Python code
- Add comments for complex logic
- Update README.md for significant changes

### API Documentation
- Document new API endpoints
- Include request/response examples
- Update Swagger/OpenAPI specs

## 🔍 Code Review Process

### For Contributors
1. Ensure your code follows style guidelines
2. Write comprehensive tests
3. Update documentation
4. Request review from maintainers

### For Reviewers
1. Check code quality and style
2. Verify tests are adequate
3. Ensure documentation is updated
4. Test the changes locally
5. Provide constructive feedback

## 🏷️ Release Process

### Version Numbering
We use semantic versioning (MAJOR.MINOR.PATCH):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Checklist
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Version bumped
- [ ] Tagged in Git
- [ ] Deployed to staging
- [ ] Deployed to production

## 🤔 Questions?

If you have questions about contributing:

1. Check existing issues and discussions
2. Join our Discord community
3. Email: dev@transcountypharmacy.com
4. Create a discussion on GitHub

## 📄 License

By contributing to this project, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to healthcare technology in Kenya! 🇰🇪**
