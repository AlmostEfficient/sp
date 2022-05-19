import React  from 'react';
import useIPFS from '../hooks/useIPFS';

const IPFSDownload = ({ hash, filename }) => {

  const file = useIPFS(hash, filename);

  return (
    <div>
      {file ? (
        <>
          <p>Thank you for your purchase!</p>
          <p>Your file is now available for download.</p>
          <a className="cta-button connect-wallet-button" href={file} download={filename}>Download</a>
        </>
      ) : (
        <p>Downloading file...</p>
      )}
    </div>
  );
};

export default IPFSDownload;
