export default function Card({ title, description, tag }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <p>{description}</p>
      {tag && <span className="tag">{tag}</span>}
    </div>
  )
}
