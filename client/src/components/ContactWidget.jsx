/**
 * ContactWidget — Floating sticky communication actions
 * WhatsApp: https://wa.me/917010034800
 * Call:     tel:+917010034800
 */
import './ContactWidget.css';

const PHONE = '+917010034800';
const WA_LINK = `https://wa.me/${PHONE.replace('+', '')}`;
const CALL_LINK = `tel:${PHONE}`;

/* ── SVG Icons ────────────────────────────────────────────────── */
const WhatsAppIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.845L.057 23.07a.75.75 0 0 0 .916.916l5.228-1.47A11.952 11.952 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.713 9.713 0 0 1-4.949-1.354l-.354-.211-3.668 1.031.98-3.578-.232-.368A9.712 9.712 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z" />
  </svg>
);

const PhoneIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M1.5 4.5a3 3 0 0 1 3-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 0 1-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 0 0 6.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 0 1 1.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 0 1-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z"
    />
  </svg>
);

/* ── Component ────────────────────────────────────────────────── */
export default function ContactWidget() {
  return (
    <div className="cw-stack" role="region" aria-label="Quick contact">

      {/* WhatsApp */}
      <a
        id="cw-whatsapp"
        href={WA_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="cw-btn cw-btn--wa"
        aria-label="Chat with us on WhatsApp"
        title="WhatsApp us"
      >
        <span className="cw-icon"><WhatsAppIcon /></span>
        <span className="cw-label">WhatsApp</span>
        <span className="cw-ripple" aria-hidden="true" />
      </a>

      {/* Call */}
      <a
        id="cw-call"
        href={CALL_LINK}
        className="cw-btn cw-btn--call"
        aria-label="Call us at +917010034800"
        title="Call us"
      >
        <span className="cw-icon"><PhoneIcon /></span>
        <span className="cw-label">Call Us</span>
        <span className="cw-ripple" aria-hidden="true" />
      </a>

    </div>
  );
}
