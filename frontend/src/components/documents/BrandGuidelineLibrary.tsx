import React, { useEffect, useState, useRef } from 'react';
import { api, ApiClientError } from '../../services/api';
import type { DocumentItem, PassageItem } from '../../types';
import {
  FileText,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  X,
  FileUp,
} from 'lucide-react';

interface BrandGuidelineLibraryProps {
  onDocumentCountChange?: (count: number) => void;
}

export const BrandGuidelineLibrary: React.FC<BrandGuidelineLibraryProps> = ({ onDocumentCountChange }) => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Passage viewer modal state
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [passages, setPassages] = useState<PassageItem[]>([]);
  const [isLoadingPassages, setIsLoadingPassages] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const docs = await api.listDocuments();
      setDocuments(docs);
      if (onDocumentCountChange) onDocumentCountChange(docs.length);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to load brand guideline documents.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await processUpload(file);
  };

  const processUpload = async (file: File) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    // Client-side validations
    const validExtensions = ['.pdf', '.docx', '.md', '.markdown'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!validExtensions.includes(ext)) {
      setErrorMessage(`Unsupported format '${ext}'. BrandPilot supports PDF, DOCX, and Markdown (.md).`);
      return;
    }

    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setErrorMessage('File size exceeds the 10 MB upload limit.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(35);

    try {
      setUploadProgress(70);
      const uploaded = await api.uploadDocument(file);
      setUploadProgress(100);
      setSuccessMessage(`Document '${uploaded.original_name}' uploaded and indexed with pgvector.`);
      await fetchDocuments();
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to upload document. Please ensure the server is running.');
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleDelete = async (docId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove '${name}' and its vector embeddings?`)) {
      return;
    }
    try {
      await api.deleteDocument(docId);
      setSuccessMessage(`Document '${name}' removed successfully.`);
      await fetchDocuments();
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to delete document.');
      }
    }
  };

  const handleViewPassages = async (doc: DocumentItem) => {
    setSelectedDoc(doc);
    setIsLoadingPassages(true);
    try {
      const items = await api.getDocumentPassages(doc.id);
      setPassages(items);
    } catch {
      setErrorMessage('Failed to load extracted passages.');
    } finally {
      setIsLoadingPassages(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'indexed':
        return (
          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={12} /> Indexed (pgvector)
          </span>
        );
      case 'processing':
        return (
          <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={12} /> Processing...
          </span>
        );
      case 'error':
        return (
          <span className="badge badge-high" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <AlertCircle size={12} /> Extraction Error
          </span>
        );
      default:
        return (
          <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={12} /> Uploaded
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Upload Banner / Drag & Drop Target */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        style={{
          border: '2px dashed var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: 'var(--color-surface)',
          padding: '32px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".pdf,.docx,.md,.markdown"
          onChange={handleFileSelect}
        />
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          backgroundColor: 'var(--color-neutral-info)',
          color: 'var(--color-burgundy)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 12px auto',
        }}>
          <FileUp size={24} />
        </div>
        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', marginBottom: '6px' }}>
          Upload Brand Guidelines & Editorial Standards
        </h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', maxWidth: '500px', margin: '0 auto 16px auto' }}>
          Drag and drop PDF, Word (DOCX), or Markdown files here, or click to browse. Files are chunked and indexed into pgvector for citation grounding.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          <span>Supported: <strong>.pdf, .docx, .md</strong></span>
          <span>&bull;</span>
          <span>Max Size: <strong>10 MB</strong></span>
          <span>&bull;</span>
          <span>Embeddings: <strong>1536-dim pgvector</strong></span>
        </div>

        {isUploading && (
          <div style={{ marginTop: '16px', maxWidth: '300px', margin: '16px auto 0 auto' }}>
            <div style={{
              height: '6px',
              backgroundColor: 'var(--color-border-subtle)',
              borderRadius: '3px',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                backgroundColor: 'var(--color-burgundy)',
                width: `${uploadProgress || 50}%`,
                transition: 'width 0.3s ease',
              }} />
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Extracting text and generating embeddings...
            </p>
          </div>
        )}
      </div>

      {/* Success / Error Alerts */}
      {successMessage && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: '#EBF5EE',
          border: '1px solid #C4E2CE',
          color: 'var(--color-success)',
          fontSize: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {errorMessage && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: '#FBEBEA',
          border: '1px solid #F3C7C4',
          color: 'var(--color-error)',
          fontSize: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Document Library List */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', margin: 0 }}>
            Indexed Brand Documents ({documents.length})
          </h4>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={fetchDocuments}
            disabled={isLoading}
          >
            Refresh
          </button>
        </div>

        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Loading document library...
          </div>
        ) : documents.length === 0 ? (
          <div style={{
            border: '1px dashed var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '36px',
            textAlign: 'center',
            backgroundColor: 'var(--color-surface)',
          }}>
            <FileText size={32} style={{ color: 'var(--color-text-muted)', margin: '0 auto 8px auto' }} />
            <p style={{ fontWeight: 500, margin: '0 0 4px 0' }}>No brand guidelines uploaded yet</p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0 }}>
              Upload your brand voice document above to ground AI and rule findings with exact source citations.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {documents.map((doc) => (
              <div
                key={doc.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-xs)',
                  gap: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--color-neutral-info)',
                    color: 'var(--color-burgundy)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <FileText size={18} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '0.9375rem', color: 'var(--color-text-primary)' }}>
                        {doc.original_name}
                      </strong>
                      {getStatusBadge(doc.status)}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                      <span>Size: {(doc.file_size / 1024).toFixed(1)} KB</span>
                      {doc.extracted_metadata?.chunk_count && (
                        <span>&bull; {doc.extracted_metadata.chunk_count} Passages</span>
                      )}
                      {doc.extracted_metadata?.page_count && doc.extracted_metadata.page_count > 1 && (
                        <span>&bull; {doc.extracted_metadata.page_count} Pages</span>
                      )}
                      <span>&bull; Uploaded {new Date(doc.created_at).toLocaleDateString()}</span>
                    </div>
                    {doc.error_message && (
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--color-error)' }}>
                        Error: {doc.error_message}
                      </p>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {doc.status === 'indexed' && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleViewPassages(doc)}
                    >
                      <Layers size={13} />
                      <span>View Passages</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--color-error)' }}
                    onClick={() => handleDelete(doc.id, doc.original_name)}
                    title="Delete document and vector embeddings"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: View Extracted Passages */}
      {selectedDoc && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(3px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: '750px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--shadow-xl)',
            overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 24px',
              borderBottom: '1px solid var(--color-border)',
            }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-serif)', margin: 0, fontSize: '1.15rem' }}>
                  Extracted Passages: {selectedDoc.original_name}
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Stored in PostgreSQL with pgvector embeddings
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setSelectedDoc(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {isLoadingPassages ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>Loading passages...</div>
              ) : passages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
                  No passages found for this document.
                </div>
              ) : (
                passages.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px 16px',
                      backgroundColor: '#FCFAF6',
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.75rem',
                      color: 'var(--color-text-muted)',
                      marginBottom: '6px',
                    }}>
                      <span style={{ fontWeight: 600, color: 'var(--color-burgundy)' }}>
                        Chunk #{p.chunk_index + 1}
                      </span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {p.heading_path && <span>{p.heading_path}</span>}
                        {p.page_number && <span>Page {p.page_number}</span>}
                      </div>
                    </div>
                    <p style={{
                      margin: 0,
                      fontSize: '0.84375rem',
                      lineHeight: 1.5,
                      color: 'var(--color-text-primary)',
                      fontFamily: 'var(--font-sans)',
                    }}>
                      {p.content}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div style={{
              padding: '12px 24px',
              borderTop: '1px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'flex-end',
            }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedDoc(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
