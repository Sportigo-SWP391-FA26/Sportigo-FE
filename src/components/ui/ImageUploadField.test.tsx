import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import * as uploads from '../../features/uploads/api';
import { ImageUploadField } from './ImageUploadField';

vi.mock('../../features/uploads/api');

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

test('uploads an image and returns the Cloudinary secure URL', async () => {
  const onChange = vi.fn();
  vi.mocked(uploads.uploadImage).mockResolvedValue({
    secureUrl: 'https://res.cloudinary.com/sportigo/image/upload/coach.webp',
    publicId: 'sportigo/avatars/coach',
    width: 800,
    height: 1000,
    format: 'webp',
  });
  render(<ImageUploadField label="Ảnh Coach" value="/images/coach-old.webp" purpose="avatar" onChange={onChange} />);

  const file = new File(['image'], 'coach.png', { type: 'image/png' });
  fireEvent.change(screen.getByLabelText('Ảnh Coach'), { target: { files: [file] } });

  await waitFor(() => expect(uploads.uploadImage).toHaveBeenCalledWith(file, 'avatar'));
  await waitFor(() => expect(onChange).toHaveBeenCalledWith('https://res.cloudinary.com/sportigo/image/upload/coach.webp'));
  expect(screen.getByText('Đã tải ảnh lên Cloudinary')).toBeInTheDocument();
});

test('keeps the existing URL when uploading fails', async () => {
  const onChange = vi.fn();
  vi.mocked(uploads.uploadImage).mockRejectedValue(new Error('Network error'));
  render(<ImageUploadField label="Ảnh bộ môn" value="/images/sport-existing.webp" purpose="sport" onChange={onChange} />);

  fireEvent.change(screen.getByLabelText('Ảnh bộ môn'), {
    target: { files: [new File(['image'], 'sport.webp', { type: 'image/webp' })] },
  });

  expect(await screen.findByRole('alert')).toHaveTextContent('Ảnh hiện tại vẫn được giữ nguyên');
  expect(onChange).not.toHaveBeenCalled();
  expect(screen.getByRole('img', { name: 'Xem trước ảnh bộ môn' })).toHaveAttribute('src', '/images/sport-existing.webp');
});
