import type { ReactNode } from "react";
import { cn } from "../lib/utils";

export const PREVIEW_WIDTHS = [280, 360, 480, 600] as const;

interface PreviewGalleryProps {
  testId: string;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}

export function PreviewGallery({
  testId,
  title,
  description,
  children,
  className,
}: PreviewGalleryProps) {
  return (
    <main
      className={cn("tuple-gallery", className)}
      data-bb-plugin="tuple"
      data-testid={testId}
    >
      <header className="tuple-gallery-header">
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      {children}
    </main>
  );
}

interface PreviewPanelProps {
  width: number;
  state?: string;
  autoHeight?: boolean;
  children: ReactNode;
  className?: string;
}

export function PreviewPanel({
  width,
  state,
  autoHeight = false,
  children,
  className,
}: PreviewPanelProps) {
  return (
    <section
      className={cn("tuple-gallery-panel", autoHeight && "tuple-gallery-panel-auto", className)}
      data-panel
      data-state={state}
      data-width={width}
      style={{ width }}
    >
      {children}
    </section>
  );
}

interface PreviewMatrixProps<Scenario extends { label: string }> {
  testId: string;
  title: string;
  description: string;
  scenarios: readonly Scenario[];
  render: (scenario: Scenario, width: number, scenarioIndex: number) => ReactNode;
  widths?: readonly number[];
  autoHeight?: boolean;
  panelClassName?: string;
  className?: string;
}

export function PreviewMatrix<Scenario extends { label: string }>({
  testId,
  title,
  description,
  scenarios,
  render,
  widths = PREVIEW_WIDTHS,
  autoHeight = false,
  panelClassName,
  className,
}: PreviewMatrixProps<Scenario>) {
  return (
    <PreviewGallery testId={testId} title={title} description={description} className={className}>
      <div className="tuple-gallery-grid">
        <div />
        {widths.map((width) => <div className="tuple-gallery-axis" key={width}>{width}px</div>)}
        {scenarios.map((scenario, scenarioIndex) => (
          <div className="tuple-gallery-row" key={scenario.label}>
            <div className="tuple-gallery-state">{scenario.label}</div>
            {widths.map((width) => (
              <PreviewPanel
                key={width}
                width={width}
                state={scenario.label}
                autoHeight={autoHeight}
                className={panelClassName}
              >
                {render(scenario, width, scenarioIndex)}
              </PreviewPanel>
            ))}
          </div>
        ))}
      </div>
    </PreviewGallery>
  );
}
