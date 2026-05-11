## ADDED Requirements

### Requirement: Static Open Graph Metadata
The application SHALL expose Open Graph metadata from the static HTML entry point so shared links have a predictable title, description, type, URL, and preview image.

#### Scenario: Link crawler reads app metadata
- **WHEN** a crawler requests the application entry document
- **THEN** the document contains `og:title`, `og:description`, `og:type`, `og:url`, and `og:image` meta tags with app-specific values

#### Scenario: Open Graph image is reachable
- **WHEN** a crawler resolves the value of `og:image`
- **THEN** the referenced preview image is served from the application static assets

### Requirement: Twitter Card Metadata
The application SHALL expose Twitter/X card metadata that mirrors the Open Graph title, description, and image intent.

#### Scenario: Twitter card crawler reads metadata
- **WHEN** a Twitter/X crawler requests the application entry document
- **THEN** the document contains `twitter:card`, `twitter:title`, `twitter:description`, and `twitter:image` meta tags

### Requirement: Environment-Safe Preview URLs
The application SHALL avoid hard-coded development-only URLs in social preview metadata.

#### Scenario: Production build contains deployable metadata
- **WHEN** the application is built for deployment
- **THEN** social preview metadata does not point to `localhost` or another development-only origin
