import { useState } from 'react';
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from 'reactstrap';
import { submitMediaRequest } from '../utils/api';

type ApiFetch = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

type RequestModalItem = {
  guid?: string;
  ratingKey?: string;
  title: string;
  type?: string;
  itemType?: string;
  childCount?: number;
} | null;

type RequestModalProps = {
  isOpen: boolean;
  toggle: () => void;
  item: RequestModalItem;
  apiFetch: ApiFetch;
  onSuccess?: () => void;
  isUpgrade?: boolean;
};

const RequestModal = ({
  isOpen,
  toggle,
  item,
  apiFetch,
  onSuccess,
  isUpgrade = false,
}: RequestModalProps) => {
  const [resolution, setResolution] = useState<string>('any');
  const [seasonsInput, setSeasonsInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const guid = item && 'ratingKey' in item ? item.ratingKey : item?.guid;
  const itemType = item && 'type' in item ? item.type : item?.itemType;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !guid || !itemType) return;
    setError(null);
    setSubmitting(true);
    try {
      const requestedResolution =
        resolution === 'any' ? null : (resolution as string);
      let requestedSeasons: number[] | null = null;
      if (itemType === 'show' && seasonsInput.trim()) {
        requestedSeasons = seasonsInput
          .split(',')
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => !Number.isNaN(n));
        if (requestedSeasons.length === 0) requestedSeasons = null;
      }
      const thumb: string | null | undefined =
        item && 'thumbPath' in item
          ? (item as { thumbPath?: string }).thumbPath
          : (item as { thumb?: string })?.thumb;
      await submitMediaRequest(apiFetch, {
        guid,
        title: item.title,
        itemType,
        requestedResolution,
        requestedSeasons,
        thumb,
        year: (item as { year?: number })?.year ?? undefined,
        duration: (item as { duration?: number })?.duration ?? undefined,
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        toggle();
        onSuccess?.();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setResolution('any');
    setSeasonsInput('');
    setError(null);
    setSuccess(false);
    toggle();
  };

  if (!item) return null;

  return (
    <Modal isOpen={isOpen} toggle={handleClose}>
      <ModalHeader toggle={handleClose}>
        {isUpgrade ? 'Upgrade Request: ' : 'Request: '}
        {item.title}
        {itemType === 'show' &&
          'childCount' in item &&
          item.childCount != null && (
            <small className="d-block text-muted mt-1">
              Total Seasons available: {item.childCount}
            </small>
          )}
      </ModalHeader>
      <form onSubmit={handleSubmit}>
        <ModalBody>
          {success ? (
            <p className="text-success mb-0">Request submitted successfully!</p>
          ) : (
            <>
              {error && (
                <div className="alert alert-danger small" role="alert">
                  {error}
                </div>
              )}
              <div className="form-group">
                <label htmlFor="resolution">Resolution</label>
                <select
                  id="resolution"
                  className="form-control"
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                >
                  <option value="any">Any</option>
                  <option value="1080p">1080p</option>
                  <option value="4K">4K</option>
                </select>
              </div>
              {itemType === 'show' && (
                <div className="form-group mt-2">
                  <label htmlFor="seasons">Requested Seasons (optional)</label>
                  <input
                    id="seasons"
                    type="text"
                    className="form-control"
                    placeholder="e.g. 1, 2, 3"
                    value={seasonsInput}
                    onChange={(e) => setSeasonsInput(e.target.value)}
                  />
                  <small className="text-muted">
                    Enter comma-separated numbers (e.g. 1, 2, 3). Leave empty
                    for all seasons.
                    {isUpgrade && (
                      <>
                        {' '}
                        Check the details page behind this modal to see which
                        seasons are already available.
                      </>
                    )}
                  </small>
                </div>
              )}
            </>
          )}
        </ModalBody>
        {!success && (
          <ModalFooter>
            <Button color="secondary" type="button" onClick={handleClose}>
              Cancel
            </Button>
            <Button color="primary" type="submit" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Request'}
            </Button>
          </ModalFooter>
        )}
      </form>
    </Modal>
  );
};

export default RequestModal;
