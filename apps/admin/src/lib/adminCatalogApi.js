const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const anonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

const functionUrl = `${supabaseUrl}/functions/v1/admin-catalog`

if (!supabaseUrl || !anonKey) {
  throw new Error('Missing VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY env vars.')
}

const parseResponse = async (response) => {
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(typeof body.error === 'string' ? body.error : 'Request failed')
  }
  return body
}

const callCatalog = async ({ action, accessToken, payload = {} }) => {
  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ action, ...payload }),
  })
  return parseResponse(response)
}

export const listCategories = ({ accessToken }) =>
  callCatalog({ action: 'list-categories', accessToken })

export const createCategory = ({ accessToken, name, description }) =>
  callCatalog({
    action: 'create-category',
    accessToken,
    payload: { name, description },
  })

export const deleteCategory = ({ accessToken, categoryId }) =>
  callCatalog({
    action: 'delete-category',
    accessToken,
    payload: { categoryId },
  })

export const reactivateCategory = ({ accessToken, categoryId }) =>
  callCatalog({
    action: 'reactivate-category',
    accessToken,
    payload: { categoryId },
  })

export const listProducts = ({ accessToken }) =>
  callCatalog({ action: 'list-products', accessToken })

export const deleteProduct = ({ accessToken, productId }) =>
  callCatalog({
    action: 'delete-product',
    accessToken,
    payload: { productId },
  })

export const reactivateProduct = ({ accessToken, productId }) =>
  callCatalog({
    action: 'reactivate-product',
    accessToken,
    payload: { productId },
  })

export const createProduct = ({
  accessToken,
  name,
  description,
  currency,
  categoryIds,
  images,
  canvasSizes,
}) =>
  callCatalog({
    action: 'create-product',
    accessToken,
    payload: { name, description, currency, categoryIds, images, canvasSizes },
  })

export const updateProduct = ({
  accessToken,
  productId,
  name,
  description,
  currency,
  categoryIds,
  imagesToAdd,
  imageIdsToRemove,
  canvasSizes,
}) =>
  callCatalog({
    action: 'update-product',
    accessToken,
    payload: {
      productId,
      name,
      description,
      currency,
      categoryIds,
      imagesToAdd,
      imageIdsToRemove,
      canvasSizes,
    },
  })

export const uploadImageToCloudinary = async ({ file, accessToken }) => {
  const signatureData = await callCatalog({
    action: 'create-upload-signature',
    accessToken,
  })

  const formData = new FormData()
  formData.append('file', file)
  formData.append('api_key', signatureData.apiKey)
  formData.append('timestamp', String(signatureData.timestamp))
  formData.append('signature', signatureData.signature)
  formData.append('folder', signatureData.folder)

  const uploadUrl = `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/image/upload`
  const response = await fetch(uploadUrl, {
    method: 'POST',
    body: formData,
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(body.error?.message ?? 'Cloudinary upload failed')
  }

  return {
    url: body.secure_url,
    publicId: body.public_id,
  }
}
