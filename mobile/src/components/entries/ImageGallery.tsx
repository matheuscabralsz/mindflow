/**
 * ImageGallery Component
 * Displays and manages images for journal entries
 * Supports upload (web only for now) and deletion
 */

import React, { useRef, useState } from 'react';
import {
  IonButton,
  IonIcon,
  IonSpinner,
  IonActionSheet,
} from '@ionic/react';
import {
  imageOutline,
  closeCircle,
  addOutline,
} from 'ionicons/icons';
import type { EntryImage } from '../../types';
import './ImageGallery.css';

interface ImageGalleryProps {
  images: EntryImage[];
  onUpload: (files: File[]) => Promise<void>;
  onDelete: (imageId: string) => Promise<void>;
  disabled?: boolean;
  loading?: boolean;
}

interface LocalImage {
  id: string;
  file: File;
  preview: string;
  uploading: boolean;
  error?: string;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  onUpload,
  onDelete,
  disabled = false,
  loading = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localImages, setLocalImages] = useState<LocalImage[]>([]);
  const [deleteImageId, setDeleteImageId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Create local previews
    const newLocalImages: LocalImage[] = files.map((file) => ({
      id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      preview: URL.createObjectURL(file),
      uploading: true,
    }));

    setLocalImages((prev) => [...prev, ...newLocalImages]);

    try {
      await onUpload(files);
      // Clear local images after successful upload
      newLocalImages.forEach((img) => URL.revokeObjectURL(img.preview));
      setLocalImages((prev) =>
        prev.filter((img) => !newLocalImages.find((n) => n.id === img.id))
      );
    } catch (error) {
      // Mark local images as failed
      setLocalImages((prev) =>
        prev.map((img) => {
          const matching = newLocalImages.find((n) => n.id === img.id);
          if (matching) {
            return {
              ...img,
              uploading: false,
              error: error instanceof Error ? error.message : 'Upload failed',
            };
          }
          return img;
        })
      );
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteImageId) return;

    setDeleting(deleteImageId);
    try {
      await onDelete(deleteImageId);
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setDeleting(null);
      setDeleteImageId(null);
    }
  };

  const removeLocalImage = (id: string) => {
    setLocalImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img) {
        URL.revokeObjectURL(img.preview);
      }
      return prev.filter((i) => i.id !== id);
    });
  };

  const allImages = [
    ...images.map((img) => ({ type: 'uploaded' as const, data: img })),
    ...localImages.map((img) => ({ type: 'local' as const, data: img })),
  ];

  return (
    <div className="image-gallery">
      <div className="gallery-header">
        <div className="gallery-title">
          <IonIcon icon={imageOutline} />
          <span>Photos</span>
          {allImages.length > 0 && (
            <span className="image-count">({allImages.length})</span>
          )}
        </div>
        <IonButton
          fill="clear"
          size="small"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || loading}
        >
          <IonIcon slot="start" icon={addOutline} />
          Add
        </IonButton>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif"
        multiple
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Image grid */}
      {allImages.length > 0 ? (
        <div className="gallery-grid">
          {allImages.map((item) => {
            if (item.type === 'uploaded') {
              const img = item.data;
              const isDeleting = deleting === img.id;
              return (
                <div key={img.id} className="gallery-item">
                  <img src={img.url} alt={img.file_name} loading="lazy" />
                  {!disabled && (
                    <button
                      className="delete-button"
                      onClick={() => setDeleteImageId(img.id)}
                      disabled={isDeleting}
                      aria-label="Delete image"
                    >
                      {isDeleting ? (
                        <IonSpinner name="crescent" />
                      ) : (
                        <IonIcon icon={closeCircle} />
                      )}
                    </button>
                  )}
                </div>
              );
            } else {
              const img = item.data;
              return (
                <div
                  key={img.id}
                  className={`gallery-item ${img.error ? 'error' : ''}`}
                >
                  <img src={img.preview} alt={img.file.name} />
                  {img.uploading && (
                    <div className="upload-overlay">
                      <IonSpinner name="crescent" />
                    </div>
                  )}
                  {img.error && (
                    <div className="error-overlay">
                      <span>Failed</span>
                      <button onClick={() => removeLocalImage(img.id)}>
                        <IonIcon icon={closeCircle} />
                      </button>
                    </div>
                  )}
                </div>
              );
            }
          })}

          {/* Add more button in grid */}
          <button
            className="gallery-add-button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || loading}
            aria-label="Add photos"
          >
            <IonIcon icon={addOutline} />
          </button>
        </div>
      ) : (
        <div
          className="gallery-empty"
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <IonIcon icon={imageOutline} />
          <span>Tap to add photos</span>
        </div>
      )}

      {/* Delete confirmation */}
      <IonActionSheet
        isOpen={!!deleteImageId}
        onDidDismiss={() => setDeleteImageId(null)}
        header="Delete this photo?"
        buttons={[
          {
            text: 'Delete',
            role: 'destructive',
            handler: handleDeleteConfirm,
          },
          {
            text: 'Cancel',
            role: 'cancel',
          },
        ]}
      />
    </div>
  );
};
