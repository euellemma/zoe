import { useState } from 'react';
import './Calculator.css';

function Calculator() {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState(null);
  const [operator, setOperator] = useState(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const inputDigit = (digit) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
    } else if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const clear = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  };

  const toggleSign = () => {
    setDisplay(String(-parseFloat(display)));
  };

  const percentage = () => {
    setDisplay(String(parseFloat(display) / 100));
  };

  const performOperation = (nextOperator) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operator) {
      const currentValue = previousValue || 0;
      let result;

      switch (operator) {
        case '+':
          result = currentValue + inputValue;
          break;
        case '-':
          result = currentValue - inputValue;
          break;
        case '×':
          result = currentValue * inputValue;
          break;
        case '÷':
          result = currentValue / inputValue;
          break;
        default:
          result = inputValue;
      }

      setDisplay(String(result));
      setPreviousValue(result);
    }

    setWaitingForOperand(true);
    setOperator(nextOperator);
  };

  const calculate = () => {
    if (!operator || previousValue === null) return;

    const inputValue = parseFloat(display);
    let result;

    switch (operator) {
      case '+':
        result = previousValue + inputValue;
        break;
      case '-':
        result = previousValue - inputValue;
        break;
      case '×':
        result = previousValue * inputValue;
        break;
      case '÷':
        result = previousValue / inputValue;
        break;
      default:
        result = inputValue;
    }

    setDisplay(String(result));
    setPreviousValue(null);
    setOperator(null);
    setWaitingForOperand(true);
  };

  const buttons = [
    { label: 'AC', action: clear, className: 'function' },
    { label: '+/-', action: toggleSign, className: 'function' },
    { label: '%', action: percentage, className: 'function' },
    { label: '÷', action: () => performOperation('÷'), className: 'operator' },
    { label: '7', action: () => inputDigit('7'), className: 'number' },
    { label: '8', action: () => inputDigit('8'), className: 'number' },
    { label: '9', action: () => inputDigit('9'), className: 'number' },
    { label: '×', action: () => performOperation('×'), className: 'operator' },
    { label: '4', action: () => inputDigit('4'), className: 'number' },
    { label: '5', action: () => inputDigit('5'), className: 'number' },
    { label: '6', action: () => inputDigit('6'), className: 'number' },
    { label: '-', action: () => performOperation('-'), className: 'operator' },
    { label: '1', action: () => inputDigit('1'), className: 'number' },
    { label: '2', action: () => inputDigit('2'), className: 'number' },
    { label: '3', action: () => inputDigit('3'), className: 'number' },
    { label: '+', action: () => performOperation('+'), className: 'operator' },
    { label: '0', action: () => inputDigit('0'), className: 'number zero' },
    { label: '.', action: inputDecimal, className: 'number' },
    { label: '=', action: calculate, className: 'operator' },
  ];

  return (
    <div className="calculator">
      <div className="display">{display}</div>
      <div className="buttons">
        {buttons.map((btn, index) => (
          <button
            key={index}
            className={`btn ${btn.className}`}
            onClick={btn.action}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default Calculator;