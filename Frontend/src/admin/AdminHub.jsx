export default function AdminHub({ cards, onNavigate }) {
  return (
    <div className="admin-quick-actions" style={{ marginBottom: 28 }}>
      {cards.map(card => (
        <button
          key={card.key}
          className="admin-quick-action"
          style={{ opacity: card.disabled ? 0.45 : 1, cursor: card.disabled ? 'not-allowed' : 'pointer' }}
          onClick={() => !card.disabled && onNavigate(card.key)}
          disabled={card.disabled}
        >
          <div className={`admin-quick-action-icon ${card.tone || 'white'}`}>
            {card.icon}
          </div>
          <div className="admin-quick-action-body">
            <h4>
              {card.label}
              {card.badge && (
                <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--admin-copper)' }}>
                  {card.badge}
                </span>
              )}
            </h4>
            <p>{card.sub}</p>
          </div>
        </button>
      ))}
    </div>
  )
}
