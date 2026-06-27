import Navbar from './components/Navbar'
import HeroSection from './components/HeroSection'
import Card from './components/Card'
import Button from './components/Button'

const items = [
  { title: 'Inspecteur source', description: 'Chaque élément DOM natif reçoit les attributs data-editui-file, data-editui-line et data-editui-component.', tag: 'core' },
  { title: 'Bundle-agnostique', description: 'Fonctionne avec Vite, Webpack, Rollup et esbuild via unplugin.', tag: 'build' },
  { title: 'Zéro impact production', description: 'Désactivé automatiquement quand NODE_ENV=production.', tag: 'perf' },
  { title: 'Détection de composant', description: 'Remonte automatiquement l\'AST pour trouver le nom du composant parent.', tag: 'babel' },
]

export default function App() {
  function handleClick() {
    alert('Bouton cliqué ! Ouvre l\'inspecteur pour voir les attributs data-editui-*')
  }

  return (
    <>
      <Navbar />
      <HeroSection />

      <section className="cards">
        {items.map((item, i) => (
          <Card key={i} {...item} />
        ))}
      </section>

      <div style={{ textAlign: 'center', padding: '0 24px 48px' }}>
        <Button variant="primary" onClick={handleClick}>
          Clique-moi
        </Button>
      </div>

      {/* Zone d'inspection : montre les attributs en direct */}
      <div className="inspector-note">
        <strong>🔍 Inspectez les éléments</strong>
        <br /><br />
        Ouvrez les DevTools (<kbd>F12</kbd>) et regardez les attributs <span className="highlight">data-editui-file</span>,
        {' '}<span className="highlight">data-editui-line</span> et <span className="highlight">data-editui-component</span>
        {' '}sur chaque balise DOM native ci-dessus.
        <br /><br />
        <span style={{ opacity: 0.5, fontSize: '11px' }}>
          Exemple avec Card.jsx → ligne {6}, composant <strong>Card</strong>
        </span>
      </div>

      <footer className="footer">
        EditUI Example — Fait avec ❤️ pour le debug source
      </footer>
    </>
  )
}
