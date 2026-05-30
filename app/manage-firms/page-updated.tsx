// This file contains the updated image upload UI section
// Replace the "Branding Assets" section in manage-firms/page.tsx with this:

                <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-semibold">Branding Assets</h3>
                  
                  {/* Letterhead Upload */}
                  <div className="space-y-2">
                    <Label htmlFor="letterhead-upload">Letterhead (Required)</Label>
                    <div className="space-y-2">
                      <Input
                        id="letterhead-upload"
                        type="file"
                        accept="image/*"
                        onChange={(event) => handleUpload('headerImagePath', event.target.files?.[0])}
                        disabled={formData.headerImagePathLoading}
                      />
                      {formData.headerImagePathLoading && (
                        <div className="flex items-center gap-2 text-xs text-blue-600">
                          <div className="h-2 w-2 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                          <span>Uploading letterhead...</span>
                        </div>
                      )}
                      {formData.headerImagePath && !formData.headerImagePath.startsWith('data:') && (
                        <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-xs">
                          <span className="truncate max-w-[200px]">{formData.headerImagePath.split('/').pop()}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteImage('headerImagePath')}
                            className="h-6 px-2 text-red-600 hover:text-red-700"
                          >
                            Delete
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Signature Upload */}
                    <div className="space-y-2">
                      <Label htmlFor="signature-upload">Signature (Optional)</Label>
                      <div className="space-y-2">
                        <Input
                          id="signature-upload"
                          type="file"
                          accept="image/png,image/*"
                          onChange={(event) => handleUpload('signatureImagePath', event.target.files?.[0])}
                          disabled={formData.signatureImagePathLoading}
                        />
                        {formData.signatureImagePathLoading && (
                          <div className="flex items-center gap-2 text-xs text-blue-600">
                            <div className="h-2 w-2 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                            <span>Uploading signature...</span>
                          </div>
                        )}
                        {formData.signatureImagePath && !formData.signatureImagePath.startsWith('data:') && (
                          <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-xs">
                            <span className="truncate max-w-[200px]">{formData.signatureImagePath.split('/').pop()}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteImage('signatureImagePath')}
                              className="h-6 px-2 text-red-600 hover:text-red-700"
                            >
                              Delete
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Stamp Upload */}
                    <div className="space-y-2">
                      <Label htmlFor="stamp-upload">Stamp (Optional)</Label>
                      <div className="space-y-2">
                        <Input
                          id="stamp-upload"
                          type="file"
                          accept="image/png,image/*"
                          onChange={(event) => handleUpload('stampImagePath', event.target.files?.[0])}
                          disabled={formData.stampImagePathLoading}
                        />
                        {formData.stampImagePathLoading && (
                          <div className="flex items-center gap-2 text-xs text-blue-600">
                            <div className="h-2 w-2 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                            <span>Uploading stamp...</span>
                          </div>
                        )}
                        {formData.stampImagePath && !formData.stampImagePath.startsWith('data:') && (
                          <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-xs">
                            <span className="truncate max-w-[200px]">{formData.stampImagePath.split('/').pop()}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteImage('stampImagePath')}
                              className="h-6 px-2 text-red-600 hover:text-red-700"
                            >
                              Delete
                            </Button>
                          </div>
                        )}
                      </div>
                      <label className="mt-2 flex items-start gap-2 text-sm">
                        <input
                          className="mt-0.5"
                          type="checkbox"
                          checked={(formData.stampMode ?? 'image') === 'generic'}
                          onChange={(event) =>
                            setFormData({
                              ...formData,
                              stampMode: event.target.checked ? 'generic' : 'image',
                            })
                          }
                        />
                        <span>
                          <span className="font-medium">Use generic stamp</span>{' '}
                          <span className="text-slate-600">
                            (FOR{' '}
                            {formData.name?.trim()
                              ? formData.name.trim().replace(/\s+/g, ' ').toUpperCase()
                              : 'FIRM NAME'}{' '}
                            / PROPRIETOR)
                          </span>
                        </span>
                      </label>
                    </div>
                  </div>

                  {(Boolean(formData.signatureImagePath) ||
                    (formData.stampMode ?? 'image') === 'generic' ||
                    Boolean(formData.stampImagePath)) && (
                    <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                      Placement X/Y are measured from the <strong>bottom-right</strong> corner of the page.
                    </p>
                  )}
                </div>