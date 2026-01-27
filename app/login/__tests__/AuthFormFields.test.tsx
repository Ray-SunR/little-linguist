// app/login/__tests__/AuthFormFields.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { AuthFormFields } from '../components/AuthFormFields'
import { vi, describe, it, expect } from 'vitest'
import React from 'react'

describe('AuthFormFields', () => {
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
})
