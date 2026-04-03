'use client';

import { useState } from 'react';
import { Check, X, Copy, Download, ExternalLink, Loader2 } from 'lucide-react';
import { useToast } from '@/components/admin/Toast';
import { Button } from '@/components/ui/button';

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  auth: boolean;
  params?: Array<{ name: string; type: string; required: boolean; description: string }>;
  body?: Array<{ name: string; type: string; required: boolean; description: string }>;
  response?: string;
}

const apiEndpoints: ApiEndpoint[] = [
  // Products
  {
    method: 'GET',
    path: '/api/products',
    description: 'List all products with pagination and search',
    auth: false,
    params: [
      { name: 'search', type: 'string', required: false, description: 'Search by name, barcode, or description' },
      { name: 'category', type: 'string', required: false, description: 'Filter by category' },
      { name: 'page', type: 'number', required: false, description: 'Page number (default: 1)' },
      { name: 'limit', type: 'number', required: false, description: 'Items per page (default: 20, max 100)' },
    ],
    response: `{ products: Product[], pagination: { page, limit, total, totalPages } }`,
  },
  {
    method: 'POST',
    path: '/api/products',
    description: 'Create a new product',
    auth: false,
    body: [
      { name: 'name', type: 'string', required: true, description: 'Product name (max 200 chars)' },
      { name: 'barcode', type: 'string', required: true, description: 'Unique barcode (max 50 chars)' },
      { name: 'price', type: 'number', required: true, description: 'Product price (> 0)' },
      { name: 'description', type: 'string', required: false, description: 'Product description (max 1000 chars)' },
      { name: 'category', type: 'string', required: false, description: 'Product category (max 100 chars)' },
      { name: 'stockQuantity', type: 'number', required: false, description: 'Stock quantity (default: 0)' },
      { name: 'imageUrl', type: 'string', required: false, description: 'Image URL' },
      { name: 'imagePublicId', type: 'string', required: false, description: 'Cloudinary public ID' },
    ],
    response: 'Product',
  },
  {
    method: 'GET',
    path: '/api/products/[id]',
    description: 'Get a single product by ID',
    auth: false,
    params: [
      { name: 'id', type: 'number', required: true, description: 'Product ID' },
    ],
    response: 'Product',
  },
  {
    method: 'PUT',
    path: '/api/products/[id]',
    description: 'Update an existing product',
    auth: false,
    params: [
      { name: 'id', type: 'number', required: true, description: 'Product ID' },
    ],
    body: [
      { name: 'name', type: 'string', required: false, description: 'Product name' },
      { name: 'barcode', type: 'string', required: false, description: 'Unique barcode' },
      { name: 'price', type: 'number', required: false, description: 'Product price' },
      { name: 'description', type: 'string', required: false, description: 'Product description' },
      { name: 'category', type: 'string', required: false, description: 'Product category' },
      { name: 'stockQuantity', type: 'number', required: false, description: 'Stock quantity' },
      { name: 'imageUrl', type: 'string', required: false, description: 'Image URL' },
      { name: 'imagePublicId', type: 'string', required: false, description: 'Cloudinary public ID' },
    ],
    response: 'Product',
  },
  {
    method: 'DELETE',
    path: '/api/products/[id]',
    description: 'Delete a product',
    auth: false,
    params: [
      { name: 'id', type: 'number', required: true, description: 'Product ID' },
    ],
    response: '{ success: true }',
  },
  {
    method: 'GET',
    path: '/api/products/barcode/[barcode]',
    description: 'Get a product by barcode',
    auth: false,
    params: [
      { name: 'barcode', type: 'string', required: true, description: 'Product barcode' },
    ],
    response: 'Product',
  },
  // Upload
  {
    method: 'POST',
    path: '/api/upload',
    description: 'Upload an image to Cloudinary',
    auth: false,
    body: [
      { name: 'file', type: 'File', required: true, description: 'Image file (JPEG, PNG, WebP, GIF, max 5MB)' },
      { name: 'folder', type: 'string', required: false, description: 'Cloudinary folder name (default: products)' },
    ],
    response: '{ url: string, public_id: string }',
  },
  // Admin Auth
  {
    method: 'POST',
    path: '/api/admin/login',
    description: 'Admin login',
    auth: false,
    body: [
      { name: 'password', type: 'string', required: true, description: 'Admin password' },
    ],
    response: '{ success: true }',
  },
  {
    method: 'POST',
    path: '/api/admin/logout',
    description: 'Admin logout',
    auth: true,
    response: '{ success: true }',
  },
];

function getMethodBadge(method: string) {
  const badges = {
    GET: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
    POST: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800',
    PUT: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800',
    DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800',
  };
  return badges[method as keyof typeof badges] || badges.GET;
}

export default function ApiDocsPage() {
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const toast = useToast();

  const copyToClipboard = async (text: string, endpoint: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedEndpoint(endpoint);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedEndpoint(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const downloadOpenApiSpec = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch('/api-docs/openapi.json');
      const spec = await response.json();
      const blob = new Blob([JSON.stringify(spec, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'openapi-spec.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Downloaded OpenAPI spec');
    } catch {
      toast.error('Failed to download spec');
    } finally {
      setIsDownloading(false);
    }
  };

  const getOpenApiUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/api-docs/openapi.json`;
    }
    return '/api-docs/openapi.json';
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-4 sm:px-6 py-4 bg-card border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              API Documentation
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              REST API endpoints for Self Super Market
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-muted-foreground">
              {apiEndpoints.length} endpoints
            </div>
            <Button
              type="button"
              onClick={downloadOpenApiSpec}
              disabled={isDownloading}
              variant="outline"
              size="sm"
              className="min-h-11 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Downloading…
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  OpenAPI Spec
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* API List */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {apiEndpoints.map((endpoint, index) => (
            <div
              key={index}
              className="bg-card rounded-lg border border-border overflow-hidden"
            >
              {/* Endpoint Header */}
              <div className="flex items-center gap-3 px-4 py-3 bg-muted/50 border-b border-border">
                <span className={`px-2.5 py-1 rounded text-xs font-bold ${getMethodBadge(endpoint.method)}`}>
                  {endpoint.method}
                </span>
                <code className="text-sm font-mono text-foreground flex-1 truncate">
                  {endpoint.path}
                </code>
                {endpoint.auth && (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                    Auth
                  </span>
                )}
                <Button
                  type="button"
                  onClick={() => copyToClipboard(`${endpoint.method} ${endpoint.path}`, endpoint.path)}
                  variant="ghost"
                  size="icon"
                  className="min-h-11 min-w-11 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  aria-label={`Copy ${endpoint.method} ${endpoint.path}`}
                >
                  {copiedEndpoint === endpoint.path ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {/* Endpoint Details */}
              <div className="p-4 space-y-4">
                {/* Description */}
                <p className="text-sm text-foreground">
                  {endpoint.description}
                </p>

                {/* Query Parameters */}
                {endpoint.params && endpoint.params.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                      Query Parameters
                    </h4>
                    <div className="bg-muted/50 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Type</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Required</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {endpoint.params.map((param) => (
                            <tr key={param.name}>
                              <td className="px-3 py-2">
                                <code className="text-blue-600 dark:text-blue-400">{param.name}</code>
                              </td>
                              <td className="px-3 py-2">
                                <span className="text-muted-foreground">{param.type}</span>
                              </td>
                              <td className="px-3 py-2">
                                {param.required ? (
                                  <Check className="w-4 h-4 text-green-500" aria-hidden="true" />
                                ) : (
                                  <X className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                                )}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">{param.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Request Body */}
                {endpoint.body && endpoint.body.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                      Request Body
                    </h4>
                    <div className="bg-muted/50 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Type</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Required</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {endpoint.body.map((param) => (
                            <tr key={param.name}>
                              <td className="px-3 py-2">
                                <code className="text-blue-600 dark:text-blue-400">{param.name}</code>
                              </td>
                              <td className="px-3 py-2">
                                <span className="text-muted-foreground">{param.type}</span>
                              </td>
                              <td className="px-3 py-2">
                                {param.required ? (
                                  <Check className="w-4 h-4 text-green-500" aria-hidden="true" />
                                ) : (
                                  <X className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                                )}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">{param.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Response */}
                {endpoint.response && (
                  <div>
                    <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                      Response
                    </h4>
                    <div className="bg-muted-900 rounded-lg p-3 overflow-x-auto">
                      <pre className="text-sm text-foreground">
                        <code>{endpoint.response}</code>
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* OpenAPI Spec Info */}
        <div className="max-w-4xl mx-auto mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h3 className="font-semibold text-blue-900 dark:text-blue-400 mb-3">OpenAPI Specification</h3>
          <div className="space-y-3">
            {/* Base URL */}
            <div>
              <span className="text-xs font-medium text-blue-800 dark:text-blue-300 uppercase tracking-wider">Base URL</span>
              <div className="mt-1 flex items-center gap-2">
                <code className="text-sm text-blue-800 dark:text-blue-300 flex-1 break-all tabular-nums">
                  {typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}
                </code>
              </div>
            </div>

            {/* OpenAPI URL */}
            <div>
              <span className="text-xs font-medium text-blue-800 dark:text-blue-300 uppercase tracking-wider">OpenAPI Endpoint</span>
              <div className="mt-1 flex items-center gap-2">
                <code className="text-sm text-blue-800 dark:text-blue-300 flex-1 break-all tabular-nums">
                  {getOpenApiUrl()}
                </code>
                <Button
                  type="button"
                  onClick={() => copyToClipboard(getOpenApiUrl(), 'openapi')}
                  variant="ghost"
                  size="icon"
                  className="min-h-11 min-w-11 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  aria-label="Copy OpenAPI URL"
                >
                  {copiedEndpoint === 'openapi' ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
                <a
                  href={getOpenApiUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center min-h-11 min-w-11 px-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  aria-label="Open OpenAPI spec in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Import Instructions */}
            <div className="pt-2 border-t border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-400">
                <span className="font-semibold">Postman:</span> Import → Link → Paste URL
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                <span className="font-semibold">Swagger UI:</span> Use online tools like{' '}
                <a
                  href="https://editor.swagger.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:no-underline"
                >
                  editor.swagger.io
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
