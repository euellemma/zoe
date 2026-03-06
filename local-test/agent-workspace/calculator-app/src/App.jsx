import { useState } from 'react'
import './App.css'

function App() {
  const [display, setDisplay] = useState('')
  const [previousOperand, setPreviousOperand] = useState('')
  const [operation, setOperation] = useState(null)
  const [waitingForOperand, setWaitingForOperand] = useState(false)

  const inputDigit = (digit) => {
    if (waitingForOperand) {
      setDisplay(digit)
      setWaitingForOperand(false)
    } else {
      setDisplay(display === '0' ? digit : display + digit)
    }
  }

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.')
      setWaitingForOperand(false)
      return
    }
    if (!display.includes('.')) {
      setDisplay(display + '.')
    }
  }

  const clear = () => {
    setDisplay('')
    setPreviousOperand('')
    setOperation(null)
    setWaitingForOperand(false)
  }

  const deleteLast = () => {
    if (display.length === 1 || display === 'Error') {
      setDisplay('0')
    } else {
      setDisplay(display.slice(0, -1))
    }
  }

  const performOperation = (nextOperation) => {
    const inputValue = parseFloat(display)

    if (previousOperand === '') {
      setPreviousOperand(display)
    } else if (operation) {
      const currentValue = parseFloat(previousOperand)
      let result

      switch (operation) {
        case '+':
          result = currentValue + inputValue
          break
        case '-':
          result = currentValue - inputValue
          break
        case '×':
          result = currentValue * inputValue
          break
        case '÷':
          result = inputValue !== 0 ? currentValue / inputValue : 'Error'
          break
        case '%':
          result = currentValue % inputValue
          break
        default:
          result = inputValue
      }

      setDisplay(String(result))
      setPreviousOperand(String(result))
    }

    setWaitingForOperand(true)
    setOperation(nextOperation)
  }

  const calculate = () => {
    if (!operation || previousOperand === '') return

    const prev = parseFloat(previousOperand)
    const current = parseFloat(display)
    let result

    switch (operation) {
      case '+':
        result = prev + current
        break
      case '-':
        result = prev - current
        break
      case '×':
        result = prev * current
        break
      case '÷':
        result = current !== 0 ? prev / current : 'Error'
        break
      case '%':
        result = prev % current
        break
      default:
        result = current
    }

    setDisplay(String(result))
    setPreviousOperand('')
    setOperation(null)
    setWaitingForOperand(true)
  }

  const toggleSign = () => {
    setDisplay(String(-parseFloat(display)))
  }

  const buttons = [
    { label: 'C', className: 'function', action: clear },
    { label: '⌫', className: 'function', action: deleteLast },
    { label: '%', className: 'function', action: () => performOperation('%') },
    { label: '÷', className: 'operator', action: () => performOperation('÷') },
    { label: '7', className: 'number', action: () => inputDigit('7') },
    { label: '8', className: 'number', action: () => inputDigit('8') },
    { label: '9', className: 'number', action: () => inputDigit('9') },
    { label: '×', className: 'operator', action: () => performOperation('×') },
    { label: '4', className: 'number', action: () => inputDigit('4') },
    { label: '5', className: 'number', action: () => inputDigit('5') },
    { label: '6', className: 'number', action: () => inputDigit('6') },
    { label: '-', className: 'operator', action: () => performOperation('-') },
    { label: '1', className: 'number', action: () => inputDigit('1') },
    { label: '2', className: 'number', action: () => inputDigit('2') },
    { label: '3', className: 'number', action: () => inputDigit('3') },
    { label: '+', className: 'operator', action: () => performOperation('+') },
    { label: '±', className: 'function', action: toggleSign },
    { label: '0', className: 'number', action: () => inputDigit('0') },
    { label: '.', className: 'function', action: inputDecimal },
    { label: '=', className: 'equals', action: calculate },
  ]

  return (
    <div className="calculator">
      <div className="display">
        <div className="previous-operand">
          {previousOperand} {operation}
        </div>
        <div className="current-operand">
          {display || '0'}
        </div>
      </div>
      <div className="buttons">
        {buttons.map((btn, index) => (
          <button
            key={index}
            className={btn.className}
            onClick={btn.action}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default App
