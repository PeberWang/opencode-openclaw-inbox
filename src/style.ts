// Colors come from the app's own theme variables, so light, dark and custom themes all apply.
export const css = `
.oci-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  padding: 0 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--v2-text-text-muted);
  font: inherit;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  cursor: default;
}
.oci-badge:hover,
.oci-badge[data-open] {
  background: var(--v2-overlay-simple-overlay-hover);
  color: var(--v2-text-text-base);
}
.oci-badge[data-quiet] .oci-claw {
  opacity: 0.55;
}
.oci-claw {
  font-size: 13px;
  line-height: 1;
}
.oci-count {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.oci-dot {
  width: 7px;
  height: 7px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--v2-icon-icon-faint);
}
.oci-dot[data-status="running"] { background: var(--v2-state-fg-warning); }
.oci-dot[data-status="unread"] { background: var(--v2-state-fg-success); }
.oci-dot[data-status="failed"] { background: var(--v2-state-fg-danger); }

.oci-pop {
  position: fixed;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  width: 420px;
  max-width: calc(100vw - 24px);
  overflow: hidden;
  border: 1px solid var(--v2-border-border-base);
  border-radius: 10px;
  background: var(--v2-background-bg-layer-01);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18), 0 2px 6px rgba(0, 0, 0, 0.08);
  color: var(--v2-text-text-base);
  font-size: 13px;
}
.oci-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px 9px;
  border-bottom: 1px solid var(--v2-border-border-muted);
}
.oci-head strong {
  font-size: 13px;
  font-weight: 600;
}
.oci-sum {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: var(--v2-text-text-muted);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.oci-link {
  flex-shrink: 0;
  padding: 2px 6px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--v2-text-text-muted);
  font: inherit;
  font-size: 12px;
  cursor: default;
}
.oci-link:hover {
  background: var(--v2-overlay-simple-overlay-hover);
  color: var(--v2-text-text-base);
}
.oci-list {
  max-height: min(360px, 60vh);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 4px;
}
.oci-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: default;
}
.oci-row:hover,
.oci-row:focus-visible {
  background: var(--v2-overlay-simple-overlay-hover);
  outline: none;
}
.oci-pop[data-mode="dark"] .oci-row:hover,
.oci-pop[data-mode="dark"] .oci-row:focus-visible,
.oci-pop[data-mode="dark"] .oci-link:hover {
  background: var(--v2-alpha-light-10);
}
.oci-row .oci-dot {
  margin-top: 6px;
}
.oci-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.oci-title,
.oci-detail {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.oci-title {
  font-size: 13px;
  font-weight: 530;
}
.oci-detail {
  color: var(--v2-text-text-muted);
  font-size: 12px;
}
.oci-empty {
  padding: 18px 12px;
  color: var(--v2-text-text-faint);
  font-size: 12px;
  text-align: center;
}
.oci-foot {
  padding: 6px 12px 8px;
  border-top: 1px solid var(--v2-border-border-muted);
  color: var(--v2-text-text-faint);
  font-size: 11px;
}
`
