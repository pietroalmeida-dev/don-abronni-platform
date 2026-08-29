import { BORDA_OPCOES } from '../../data/borderOptions';

export default function BorderOptions({ groupName, selectedId, onChange }) {
  return (
    <div className="border-options">
      {BORDA_OPCOES.map((op) => (
        <label key={op.id} className={`checkout-radio-card border-radio-card ${selectedId === op.id ? 'active' : ''}`}>
          <input
            type="radio"
            name={groupName}
            value={op.id}
            checked={selectedId === op.id}
            onChange={() => onChange(op.id)}
          />
          <i className={`fa-solid ${op.icon}`} />
          <span>{op.label}</span>
          <small>{op.desc}</small>
        </label>
      ))}
    </div>
  );
}
