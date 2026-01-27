// app/login/__tests__/AuthFormFields.test.tsx
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { AuthFormFields } from '../components/AuthFormFields'
import { vi, describe, it, expect, afterEach } from 'vitest'
import React from 'react'

describe('AuthFormFields', () => {
    afterEach(() => {
        cleanup()
    })

    it('updates email state correctly and calls onEmailCheck on submit', async () => {
        const onEmailCheck = vi.fn((e) => e.preventDefault())
        render(<AuthFormFields 
            authStep="email" 
            loading={null} 
            onEmailCheck={onEmailCheck} 
            onEmailAuth={vi.fn()}
            error={null}
            emailExists={null}
        />)
        
        const input = screen.getByLabelText(/Email address/i) as HTMLInputElement
        fireEvent.change(input, { target: { value: 'test@example.com' } })
        expect(input.value).toBe('test@example.com')
        
        const button = screen.getByRole('button', { name: /Continue/i })
        fireEvent.click(button)
        expect(onEmailCheck).toHaveBeenCalled()
    })

    it('renders password field and handles submission in identity step', async () => {
        const onEmailAuth = vi.fn((e) => e.preventDefault())
        render(<AuthFormFields 
            authStep="identity" 
            loading={null} 
            onEmailCheck={vi.fn()} 
            onEmailAuth={onEmailAuth}
            error={null}
            emailExists={true}
            initialEmail="test@example.com"
        />)
        
        const emailInput = screen.getByLabelText(/Email address \(read-only\)/i) as HTMLInputElement
        expect(emailInput.value).toBe('test@example.com')
        expect(emailInput.readOnly).toBe(true)
        
        const passwordInput = screen.getByLabelText(/Secret Word \(Password\)/i) as HTMLInputElement
        fireEvent.change(passwordInput, { target: { value: 'password123' } })
        expect(passwordInput.value).toBe('password123')
        
        const button = screen.getByRole('button', { name: /Enter Realm/i })
        fireEvent.click(button)
        expect(onEmailAuth).toHaveBeenCalled()
    })

    it('displays error messages correctly', () => {
        render(<AuthFormFields 
            authStep="email" 
            loading={null} 
            onEmailCheck={vi.fn()} 
            onEmailAuth={vi.fn()}
            error="Magic error occurred"
            emailExists={null}
        />)
        
        expect(screen.getByText(/Magic error occurred/i)).toBeDefined()
    })

    it('disables buttons during loading', () => {
        render(<AuthFormFields 
            authStep="email" 
            loading="checking" 
            onEmailCheck={vi.fn()} 
            onEmailAuth={vi.fn()}
            error={null}
            emailExists={null}
        />)
        
        // Find by aria-label since text is replaced by loader
        const button = screen.getByLabelText(/Checking email|Continue/i) as HTMLButtonElement
        expect(button.disabled).toBe(true)
    })
})
