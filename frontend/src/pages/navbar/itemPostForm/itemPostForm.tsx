import { useState, useEffect } from "react";
import "./itemPostForm.css";
import { MapPicker } from "../../../components/Map/MapPicker";

interface ItemPostFormProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  onPostSuccess?: () => void;
}

const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;

interface Building {
  id: string;
  name: string;
  lng: number;
  lat: number;
}

export default function ItemPostForm({
  isOpen,
  onClose,
  isDarkMode,
  onPostSuccess,
}: ItemPostFormProps) {
  const [formData, setFormData] = useState({
    type: "found",
    title: "",
    description: "",
    buildingName: "",
    latitude: "",
    longitude: "",
  });
  const [postLimitReached, setPostLimitReached] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingSuggestions, setBuildingSuggestions] = useState<Building[]>(
    []
  );
  const [showBuildingSuggestions, setShowBuildingSuggestions] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [selectedCoordinates, setSelectedCoordinates] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Check post limit on open
  useEffect(() => {
    const checkPostLimit = async () => {
      const authToken = localStorage.getItem('authToken');
      if (!authToken) return;
      try {
        const response = await fetch(`${API_BASE_URL}/items/my`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (response.ok) {
          const data = await response.json();
          setPostLimitReached(data.items.length >= 10);
        }
      } catch {
        // Error checking post limit, silently ignore
      }
    };
    if (isOpen) checkPostLimit();
  }, [isOpen]);

  // Fetch buildings on mount
  useEffect(() => {
    const fetchBuildings = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/buildings`);
        if (response.ok) {
          const data = await response.json();
          setBuildings(data.buildings || []);
        }
      } catch (err) {
        console.error("Error fetching buildings:", err);
      }
    };
    if (isOpen) {
      fetchBuildings();
    }
  }, [isOpen]);

  if (!isOpen) return null;
  if (postLimitReached) {
    return (
      <div className={`item-post-form-modal ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
        <div className="item-post-form-container">
          <h2>Post Limit Reached</h2>
          <p style={{ color: 'red' }}>You have reached the maximum of 10 posts. Delete an item to add a new one.</p>
          <button className="item-post-form-cancel" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Handle building name input with autocomplete
    if (name === "buildingName") {
      if (value.trim()) {
        const filtered = buildings.filter(
          (building) =>
            building.name.toLowerCase().includes(value.toLowerCase()) ||
            building.id.toLowerCase().includes(value.toLowerCase())
        );
        setBuildingSuggestions(filtered.slice(0, 5));
        setShowBuildingSuggestions(true);
      } else {
        setBuildingSuggestions([]);
        setShowBuildingSuggestions(false);
      }
    }
  };

  const handleBuildingSelect = (building: Building) => {
    setFormData((prev) => ({
      ...prev,
      buildingName: building.name,
      latitude: "",
      longitude: "",
    }));
    setShowBuildingSuggestions(false);
    setShowMapPicker(false);
    setSelectedCoordinates(null);
  };

  const handleLocationSelect = (lat: number, lng: number) => {
    setSelectedCoordinates({ lat, lng });
    setFormData((prev) => ({
      ...prev,
      latitude: lat.toString(),
      longitude: lng.toString(),
      buildingName: "", // Clear building name when using map picker
    }));
    setShowBuildingSuggestions(false);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("Please select a valid image file");
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size must be less than 5MB");
        return;
      }
      setSelectedImage(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validate required fields
    if (!formData.title.trim()) {
      setError("Please enter a title");
      return;
    }
    if (!formData.description.trim()) {
      setError("Please enter a description");
      return;
    }
    // Validate location: either building name OR coordinates required
    if (
      !formData.buildingName.trim() &&
      (!formData.latitude || !formData.longitude)
    ) {
      setError("Please select a building OR pick a location on the map");
      return;
    }

    try {
      setIsSubmitting(true);

      // Get auth token from localStorage
      const authToken = localStorage.getItem("authToken");
      if (!authToken) {
        setError("Authentication token not found. Please log in again.");
        return;
      }

      // Prepare form data for multipart/form-data
      const formDataToSend = new FormData();
      formDataToSend.append("type", formData.type);
      formDataToSend.append("title", formData.title);
      formDataToSend.append("description", formData.description);
      formDataToSend.append("buildingName", formData.buildingName || "");

      // Add coordinates if provided (from map picker)
      if (formData.latitude && formData.longitude) {
        formDataToSend.append("latitude", formData.latitude);
        formDataToSend.append("longitude", formData.longitude);
      }

      // Add image if selected
      if (selectedImage) {
        formDataToSend.append("image", selectedImage);
      }

      // Send to backend
      const response = await fetch(`${API_BASE_URL}/items`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to post item");
      }

      setSuccess(true);
      setFormData({
        type: "found",
        title: "",
        description: "",
        buildingName: "",
        latitude: "",
        longitude: "",
      });
      setSelectedCoordinates(null);
      setShowMapPicker(false);
      setShowBuildingSuggestions(false);
      setSelectedImage(null);
      setImagePreview(null);

      // Dispatch event to notify all pages of new post
      window.dispatchEvent(new Event("itemPosted"));

      // Close modal after 1.5 seconds
      setTimeout(() => {
        onClose();
        if (onPostSuccess) {
          onPostSuccess();
        }
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
      console.error("Error posting item:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`item-post-form-overlay ${
        isDarkMode ? "dark-mode" : "light-mode"
      }`}
      onClick={onClose}
    >
      <div
        className="item-post-form-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button className="item-post-form-close" onClick={onClose}>
          &times;
        </button>

        {/* Success message */}
        {success && (
          <div className="item-post-form-success">
            ✓ Item posted successfully!
          </div>
        )}

        {/* Error message */}
        {error && <div className="item-post-form-error">{error}</div>}

        <h2 className="item-post-form-title">Post an Item</h2>

        <form onSubmit={handleSubmit} className="item-post-form">
          {/* Type selection */}
          <div className="item-post-form-group">
            <label htmlFor="type">Item Type</label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              className="item-post-form-input"
              required
            >
              <option value="found">Found</option>
              <option value="lost">Lost</option>
            </select>
          </div>

          {/* Title */}
          <div className="item-post-form-group">
            <label htmlFor="title">Item Title *</label>
            <input
              id="title"
              type="text"
              name="title"
              placeholder="e.g., Water Bottle"
              value={formData.title}
              onChange={handleInputChange}
              className="item-post-form-input"
              required
            />
          </div>

          {/* Description */}
          <div className="item-post-form-group">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              name="description"
              placeholder="Describe the item in detail..."
              value={formData.description}
              onChange={handleInputChange}
              className="item-post-form-textarea"
              rows={4}
              required
            />
          </div>

          {/* Image Upload */}
          <div className="item-post-form-group">
            <label htmlFor="image">Item Image</label>
            <div className="item-post-form-image-section">
              {!imagePreview ? (
                <div className="item-post-form-image-upload">
                  <input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="item-post-form-file-input"
                  />
                  <label
                    htmlFor="image"
                    className="item-post-form-file-label"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="item-post-form-upload-icon"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span>Click to upload image</span>
                    <span className="item-post-form-file-hint">
                      Max 5MB, JPG/PNG/GIF
                    </span>
                  </label>
                </div>
              ) : (
                <div className="item-post-form-image-preview-wrapper">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="item-post-form-image-preview"
                  />
                  <button
                    type="button"
                    className="item-post-form-remove-image"
                    onClick={handleRemoveImage}
                    title="Remove image"
                  >
                    &times;
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Building Name with Autocomplete */}
          <div className="item-post-form-group">
            <label htmlFor="buildingName">Location / Building Name *</label>
            <div className="item-post-form-building-input-wrapper">
              <input
                id="buildingName"
                type="text"
                name="buildingName"
                placeholder="e.g., D14, C10, Mensa"
                value={formData.buildingName}
                onChange={handleInputChange}
                onFocus={() => {
                  if (formData.buildingName.trim()) {
                    const filtered = buildings.filter(
                      (building) =>
                        building.name
                          .toLowerCase()
                          .includes(formData.buildingName.toLowerCase()) ||
                        building.id
                          .toLowerCase()
                          .includes(formData.buildingName.toLowerCase())
                    );
                    setBuildingSuggestions(filtered.slice(0, 5));
                    setShowBuildingSuggestions(true);
                  }
                }}
                onBlur={() => {
                  // Delay hiding suggestions to allow click
                  setTimeout(() => setShowBuildingSuggestions(false), 200);
                }}
                className="item-post-form-input"
              />
              {showBuildingSuggestions && buildingSuggestions.length > 0 && (
                <div className="item-post-form-building-suggestions">
                  {buildingSuggestions.map((building) => (
                    <div
                      key={building.id}
                      className="item-post-form-building-suggestion"
                      onClick={() => handleBuildingSelect(building)}
                    >
                      <strong>{building.id}</strong> - {building.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="item-post-form-location-options">
              <p className="item-post-form-location-hint">
                Select building OR pick location on map
              </p>
              {!showMapPicker && (
                <button
                  type="button"
                  className="item-post-form-use-map-button"
                  onClick={() => {
                    setShowMapPicker(true);
                    setFormData((prev) => ({ ...prev, buildingName: "" }));
                    setShowBuildingSuggestions(false);
                    setSelectedCoordinates(null);
                  }}
                >
                  Or pick location on map instead
                </button>
              )}
            </div>
          </div>

          {/* Map Picker - shown when user chooses to use map */}
          {showMapPicker && (
            <div className="item-post-form-group">
              <label>Pick Location on Map</label>
              <div className="item-post-form-map-picker-wrapper">
                <MapPicker
                  onLocationSelect={handleLocationSelect}
                  initialLat={selectedCoordinates?.lat}
                  initialLng={selectedCoordinates?.lng}
                  isDarkMode={isDarkMode}
                />
              </div>
              <button
                type="button"
                className="item-post-form-use-building-button"
                onClick={() => {
                  setShowMapPicker(false);
                  setSelectedCoordinates(null);
                  setFormData((prev) => ({
                    ...prev,
                    latitude: "",
                    longitude: "",
                  }));
                }}
              >
                Or select a building instead
              </button>
            </div>
          )}

          {/* Submit button */}
          <div className="item-post-form-buttons">
            <button
              type="submit"
              className="item-post-form-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Posting..." : "Post Item"}
            </button>
            <button
              type="button"
              className="item-post-form-cancel"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          </div>
        </form>

        <p className="item-post-form-note">
          * Required fields. Your user ID will be automatically set as the
          founder.
        </p>
      </div>
    </div>
  );
}
