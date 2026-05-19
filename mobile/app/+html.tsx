import { ScrollViewStyleReset } from 'expo-router/html'
import type { PropsWithChildren } from 'react'

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{
          __html: `
            * { box-sizing: border-box; margin: 0; padding: 0; }

            body {
              background: #e5e7eb;
              display: flex;
              justify-content: center;
              align-items: flex-start;
              min-height: 100vh;
              padding: 32px 0;
            }

            #root {
              width: 390px;
              height: 844px;
              max-height: 90vh;
              border-radius: 44px;
              overflow: hidden;
              box-shadow:
                0 0 0 10px #1f2937,
                0 0 0 12px #374151,
                0 32px 64px rgba(0,0,0,0.4);
              position: relative;
              background: #fff;
            }

            /* notch */
            #root::before {
              content: '';
              position: absolute;
              top: 0;
              left: 50%;
              transform: translateX(-50%);
              width: 120px;
              height: 28px;
              background: #1f2937;
              border-radius: 0 0 20px 20px;
              z-index: 9999;
            }
          `,
        }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
