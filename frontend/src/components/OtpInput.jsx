import { useRef, useState } from 'react';

export default function OtpInput({ length = 6, onChange }) {
  const [values, setValues] = useState(Array(length).fill(''));
  const refs = useRef([]);

  function handleChange(index, e) {
    const val = e.target.value.replace(/\D/g, '');
    if (!val) return;
    const newValues = [...values];
    newValues[index] = val.slice(-1);
    setValues(newValues);
    onChange(newValues.join(''));
    if (index < length - 1 && val) {
      refs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace' && !values[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    const newValues = [...values];
    pasted.split('').forEach((char, i) => {
      if (i < length) newValues[i] = char;
    });
    setValues(newValues);
    onChange(newValues.join(''));
    const nextIndex = Math.min(pasted.length, length - 1);
    refs.current[nextIndex]?.focus();
  }

  return (
    <div className="flex gap-2 justify-center">
      {values.map((val, i) => (
        <input
          key={i}
          ref={el => refs.current[i] = el}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={val}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          className="w-12 h-14 text-center text-xl font-bold border border-border rounded-xl 
                     focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                     transition-all duration-200"
        />
      ))}
    </div>
  );
}
