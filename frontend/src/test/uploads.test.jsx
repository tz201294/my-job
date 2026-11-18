import { afterEach, describe, expect, it, vi } from 'vitest';
import React, { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

afterEach(() => { vi.restoreAllMocks(); vi.resetModules(); });

// A fresh copy of the field each time (it remembers the server's upload status per page load).
async function renderField({ images = true, upload, purpose = 'post' } = {}) {
  const { api } = await import('../api/client');
  vi.spyOn(api, 'getUploadStatus').mockResolvedValue({ images, max_mb: 10 });
  const uploadImage = vi.spyOn(api, 'uploadImage').mockImplementation(upload || (async () => ({ url: 'https://cdn.example/p.webp' })));
  const { default: ImageField } = await import('../components/ImageField');
  const changes = [];
  function Host() {
    const [v, setV] = useState('');
    return <ImageField label="Cover photo" value={v} onChange={(x) => { changes.push(x); setV(x); }} purpose={purpose} inputId="cover" />;
  }
  render(<Host />);
  return { uploadImage, changes };
}

const choose = async (file) => {
  await act(async () => { fireEvent.change(screen.getByTestId('cover-file'), { target: { files: [file] } }); });
};
const photo = () => new File([new Uint8Array([1, 2, 3])], 'me.jpg', { type: 'image/jpeg' });

describe('photo fields', () => {
  it('upload a photo and use its address', async () => {
    const { uploadImage, changes } = await renderField({ purpose: 'avatar' });
    await screen.findByRole('button', { name: 'Upload photo' });
    await choose(photo());
    expect(uploadImage).toHaveBeenCalledWith(expect.any(File), 'avatar');
    await waitFor(() => expect(changes).toEqual(['https://cdn.example/p.webp']));
    expect(screen.getByLabelText('Cover photo').value).toBe('https://cdn.example/p.webp');
    expect(screen.getByAltText('Preview').getAttribute('src')).toBe('https://cdn.example/p.webp');

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Remove photo' })); });
    expect(screen.getByLabelText('Cover photo').value).toBe('');
  });

  it("show the server's reason when an upload fails", async () => {
    await renderField({ upload: async () => { throw new Error('That photo is too big. The limit is 10 MB.'); } });
    await screen.findByRole('button', { name: 'Upload photo' });
    await choose(photo());
    expect((await screen.findByRole('alert')).textContent).toBe('That photo is too big. The limit is 10 MB.');
    expect(screen.getByRole('button', { name: 'Upload photo' }).disabled).toBe(false);
  });

  it('refuse files that are not photos before uploading', async () => {
    const { uploadImage } = await renderField();
    await screen.findByRole('button', { name: 'Upload photo' });
    await choose(new File(['hello'], 'notes.txt', { type: 'text/plain' }));
    expect(screen.getByRole('alert').textContent).toMatch('choose a photo');
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it('fall back to a link when the server has no photo storage', async () => {
    await renderField({ images: false });
    await waitFor(() => expect(screen.getByText('Paste a link to an image.')).toBeTruthy());
    expect(screen.queryByRole('button', { name: 'Upload photo' })).toBeNull();
    await act(async () => { fireEvent.change(screen.getByLabelText('Cover photo'), { target: { value: 'https://x.example/a.jpg' } }); });
    expect(screen.getByAltText('Preview').getAttribute('src')).toBe('https://x.example/a.jpg');
  });
});
