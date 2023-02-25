import { shell } from 'electron';
import React, { ReactNode } from 'react';

type ExternalLinkProps = {
  url: string;
  children: ReactNode;
};

/** Opens link in default app. */
const ExternalLink = ({ url, children }: ExternalLinkProps) => {
  return (
    <a
      href={url}
      title={url}
      rel="noreferrer"
      target="_blank"
      onClickCapture={(event) => {
        event.preventDefault();
        shell.openExternal(url);
      }}
    >
      {children}
    </a>
  );
};

export default ExternalLink;