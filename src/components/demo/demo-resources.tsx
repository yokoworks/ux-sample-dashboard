import { Download } from 'lucide-react';
import styles from './demo-resources.module.css';

/** Portfolio resources, separate from the Figma daily-shift interface. */
export function DemoResources() {
  return (
    <aside className={styles.banner} aria-labelledby="demo-resources-title">
      <div className={`page-container ${styles.resources}`}>
        <div className={styles.copy}>
          <h2 id="demo-resources-title">Try the demo</h2>
          <p id="demo-resources-description">
            Download and unzip the example files, then choose one with Upload
            CSV.
          </p>
        </div>
        <a
          className={`button button--secondary ${styles.download}`}
          href="/examples/linden-example-csvs.zip"
          download="linden-example-csvs.zip"
          aria-describedby="demo-resources-description"
        >
          <Download size={16} aria-hidden="true" />
          <span>Download example CSVs (.zip)</span>
        </a>
      </div>
    </aside>
  );
}

/** Links to the project sources and specification. */
export function DemoFooter() {
  return (
    <footer className={`page-container ${styles.footer}`}>
      <p>© 2026 Yoko Shiina</p>
      <nav aria-label="Project resources">
        <ul className={styles.links}>
          <li>
            <a href="https://github.com/yokoworks/ux-sample-dashboard">
              GitHub
            </a>
          </li>
          <li>
            <a href="https://www.figma.com/design/mLdmFMaurH8tFL0VwA6TuK/Linden-Bakery---Caf%C3%A9---Staff-Schedule-Dashboard?node-id=0-1">
              Figma
            </a>
          </li>
          <li>
            <a href="https://ux.solastudio.studio/spec-sample">
              Interactive specification
            </a>
          </li>
        </ul>
      </nav>
    </footer>
  );
}
