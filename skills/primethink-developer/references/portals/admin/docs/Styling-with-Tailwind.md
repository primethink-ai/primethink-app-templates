# Styling with Tailwind CSS

## Overview

Live Pages have full support for **Tailwind CSS**, a utility-first CSS framework that allows you to rapidly build modern user interfaces. PrimeThink does not inject Tailwind. Dynamic/no-build apps load the pinned browser build in source HTML; compiled React/Vite apps install Tailwind and emit CSS during the build. Choose the correct workflow in [Tailwind CSS v4 Setup](Live-Apps-Tailwind-v4.md) before using the patterns on this page.

## Dark Mode Support

Live Pages support dark and light mode following the PrimeThink theme setting. Both Tailwind workflows retain the [host-theme bootstrap and class-based dark variant](Live-Apps-Tailwind-v4.md#dark-mode), which set the `dark` or `light` class on `<html>`. Your app should include styles for both modes.

**How it works:**
- The `dark` class is added to the `<html>` element when dark mode is active
- The `light` class is added when light mode is active
- Your app should always include both light and dark mode classes together

**Example:**

```html
<!-- Always include both light and dark mode classes -->
<div class="bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-4 rounded-lg">
    <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100">Title</h2>
    <p class="text-gray-600 dark:text-gray-300">Content that adapts to dark mode</p>
</div>

<!-- Card with dark mode support -->
<div class="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md dark:shadow-gray-900/50 p-6">
    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Card Title</h3>
    <p class="text-gray-600 dark:text-gray-400">Card content here.</p>
</div>

<!-- Button with dark mode support -->
<button class="bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white px-4 py-2 rounded-md">
    Click me
</button>

<!-- Input with dark mode support -->
<input
    type="text"
    class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500"
    placeholder="Enter text..."
>
```

**Common Dark Mode Patterns:**

| Light Mode | Dark Mode | Usage |
|------------|-----------|-------|
| `bg-white` | `dark:bg-gray-800` | Card backgrounds |
| `bg-gray-50` | `dark:bg-gray-900` | Page backgrounds |
| `bg-gray-100` | `dark:bg-gray-700` | Secondary backgrounds |
| `text-gray-900` | `dark:text-white` | Primary text |
| `text-gray-600` | `dark:text-gray-300` | Secondary text |
| `text-gray-500` | `dark:text-gray-400` | Muted text |
| `border-gray-200` | `dark:border-gray-700` | Borders |
| `border-gray-300` | `dark:border-gray-600` | Input borders |

**Best Practice:** Always design with both modes in mind from the start. Every color class should have a corresponding `dark:` variant.

```html
<!-- ✅ GOOD: Both modes supported -->
<div class="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
    Content
</div>

<!-- ❌ AVOID: Only light mode -->
<div class="bg-white text-gray-900">
    Content (will look bad in dark mode)
</div>
```

## Benefits of Tailwind in Live Pages

* **Rapid prototyping**: Build interfaces quickly without writing custom CSS
* **Consistent design**: Use Tailwind's design system for cohesive styling
* **Responsive by default**: Built-in responsive utilities
* **No CSS conflicts**: Utility classes eliminate CSS specificity issues
* **Per-app setup**: Pin the browser build for a dynamic app or the npm/Vite packages for a compiled app, as described in [Tailwind CSS v4 Setup](Live-Apps-Tailwind-v4.md)

## Basic Usage

Simply use Tailwind utility classes in your HTML:

```html
<div class="bg-blue-500 text-white p-4 rounded-lg shadow-md">
    <h2 class="text-xl font-bold mb-2">Welcome</h2>
    <p class="text-blue-100">This is styled with Tailwind CSS</p>
</div>
```

## Common Utility Classes

### Layout

```html
<!-- Container -->
<div class="container mx-auto p-6">
    Content centered with padding
</div>

<!-- Flexbox -->
<div class="flex justify-between items-center gap-4">
    <div>Left</div>
    <div>Right</div>
</div>

<!-- Grid -->
<div class="grid grid-cols-3 gap-4">
    <div>Column 1</div>
    <div>Column 2</div>
    <div>Column 3</div>
</div>

<!-- Spacing -->
<div class="p-4 m-2">      <!-- Padding 1rem, Margin 0.5rem -->
<div class="px-6 py-3">    <!-- Horizontal/Vertical padding -->
<div class="mt-4 mb-2">    <!-- Margin top/bottom -->
```

### Typography

```html
<!-- Text Size -->
<h1 class="text-4xl">Large Heading</h1>
<h2 class="text-2xl">Medium Heading</h2>
<p class="text-base">Normal text</p>
<small class="text-sm">Small text</small>

<!-- Text Weight & Style -->
<p class="font-bold">Bold text</p>
<p class="font-semibold">Semi-bold text</p>
<p class="font-normal">Normal text</p>
<p class="italic">Italic text</p>

<!-- Text Color -->
<p class="text-gray-900">Dark gray</p>
<p class="text-blue-500">Blue</p>
<p class="text-red-600">Red</p>

<!-- Text Alignment -->
<p class="text-left">Left aligned</p>
<p class="text-center">Centered</p>
<p class="text-right">Right aligned</p>
```

### Colors

```html
<!-- Background Colors -->
<div class="bg-blue-500">Blue background</div>
<div class="bg-gray-100">Light gray background</div>
<div class="bg-red-600">Red background</div>

<!-- Text Colors -->
<p class="text-blue-500">Blue text</p>
<p class="text-gray-700">Gray text</p>

<!-- Border Colors -->
<div class="border border-blue-500">Blue border</div>
```

### Borders & Shadows

```html
<!-- Borders -->
<div class="border">Simple border</div>
<div class="border-2">Thicker border</div>
<div class="border-t">Top border only</div>

<!-- Border Radius -->
<div class="rounded">Slightly rounded</div>
<div class="rounded-lg">More rounded</div>
<div class="rounded-full">Fully rounded (pill shape)</div>

<!-- Shadows -->
<div class="shadow">Small shadow</div>
<div class="shadow-md">Medium shadow</div>
<div class="shadow-lg">Large shadow</div>
```

## Component Examples

### Cards

```html
<!-- Simple Card -->
<div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
    <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Card Title</h3>
    <p class="text-gray-600 dark:text-gray-300">Card content goes here.</p>
</div>

<!-- Card with Image -->
<div class="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
    <img src="image.jpg" alt="Card image" class="w-full h-48 object-cover">
    <div class="p-6">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Card with Image</h3>
        <p class="text-gray-600 dark:text-gray-300">Description text here.</p>
    </div>
</div>

<!-- Card with Actions -->
<div class="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
    <div class="p-6">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Task Item</h3>
        <p class="text-gray-600 dark:text-gray-300 mb-4">Task description here.</p>
        <div class="flex gap-2">
            <button class="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600">
                Edit
            </button>
            <button class="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600">
                Delete
            </button>
        </div>
    </div>
</div>
```

### Buttons

```html
<!-- Primary Button -->
<button class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
    Primary Button
</button>

<!-- Secondary Button -->
<button class="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">
    Secondary Button
</button>

<!-- Danger Button -->
<button class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700">
    Delete
</button>

<!-- Small Button -->
<button class="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600">
    Small
</button>

<!-- Disabled Button -->
<button class="bg-gray-400 text-white px-4 py-2 rounded-md cursor-not-allowed opacity-50" disabled>
    Disabled
</button>

<!-- Button Group -->
<div class="flex gap-2">
    <button class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">
        Save
    </button>
    <button class="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">
        Cancel
    </button>
</div>
```

### Forms

```html
<!-- Text Input -->
<div class="mb-4">
    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Name
    </label>
    <input
        type="text"
        class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        placeholder="Enter name"
    >
</div>

<!-- Textarea -->
<div class="mb-4">
    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Description
    </label>
    <textarea
        rows="4"
        class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        placeholder="Enter description"
    ></textarea>
</div>

<!-- Select -->
<div class="mb-4">
    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Priority
    </label>
    <select class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
        <option>Low</option>
        <option>Medium</option>
        <option>High</option>
    </select>
</div>

<!-- Checkbox -->
<label class="flex items-center">
    <input type="checkbox" class="h-4 w-4 text-blue-600 rounded">
    <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">I agree to the terms</span>
</label>

<!-- Radio Buttons -->
<div class="space-y-2">
    <label class="flex items-center">
        <input type="radio" name="option" class="h-4 w-4 text-blue-600">
        <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Option 1</span>
    </label>
    <label class="flex items-center">
        <input type="radio" name="option" class="h-4 w-4 text-blue-600">
        <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Option 2</span>
    </label>
</div>
```

### Lists

```html
<!-- Simple List -->
<ul class="space-y-2">
    <li class="bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-4 rounded shadow">Item 1</li>
    <li class="bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-4 rounded shadow">Item 2</li>
    <li class="bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-4 rounded shadow">Item 3</li>
</ul>

<!-- List with Actions -->
<div class="space-y-2">
    <div class="bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-4 rounded shadow flex justify-between items-center">
        <span>Task item</span>
        <div class="flex gap-2">
            <button class="text-blue-500 dark:text-blue-400 text-sm">Edit</button>
            <button class="text-red-500 dark:text-red-400 text-sm">Delete</button>
        </div>
    </div>
</div>

<!-- Striped List -->
<div class="divide-y divide-gray-200 dark:divide-gray-700">
    <div class="p-4 hover:bg-gray-50 dark:hover:bg-gray-800">Item 1</div>
    <div class="p-4 hover:bg-gray-50 dark:hover:bg-gray-800">Item 2</div>
    <div class="p-4 hover:bg-gray-50 dark:hover:bg-gray-800">Item 3</div>
</div>
```

### Badges & Tags

```html
<!-- Status Badges -->
<span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
    Active
</span>
<span class="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
    Inactive
</span>
<span class="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
    Pending
</span>

<!-- Priority Tags -->
<span class="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
    High Priority
</span>
<span class="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
    Medium Priority
</span>
<span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
    Low Priority
</span>
```

### Alerts & Notifications

```html
<!-- Success Alert -->
<div class="bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-200 px-4 py-3 rounded mb-4">
    <strong class="font-bold">Success!</strong>
    <span class="block sm:inline">Task created successfully.</span>
</div>

<!-- Error Alert -->
<div class="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded mb-4">
    <strong class="font-bold">Error!</strong>
    <span class="block sm:inline">Something went wrong.</span>
</div>

<!-- Warning Alert -->
<div class="bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 dark:border-yellow-700 text-yellow-700 dark:text-yellow-200 px-4 py-3 rounded mb-4">
    <strong class="font-bold">Warning!</strong>
    <span class="block sm:inline">Please review your changes.</span>
</div>

<!-- Info Alert -->
<div class="bg-blue-100 dark:bg-blue-900 border border-blue-400 dark:border-blue-700 text-blue-700 dark:text-blue-200 px-4 py-3 rounded mb-4">
    <strong class="font-bold">Info:</strong>
    <span class="block sm:inline">This is an informational message.</span>
</div>
```

### Modal/Dialog

```html
<!-- Modal Overlay -->
<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
    <!-- Modal Content -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Confirm Delete</h3>
        <p class="text-gray-600 dark:text-gray-300 mb-6">Are you sure you want to delete this item?</p>
        <div class="flex justify-end gap-2">
            <button class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600">
                Cancel
            </button>
            <button class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                Delete
            </button>
        </div>
    </div>
</div>
```

## Responsive Design

Tailwind makes responsive design simple with breakpoint prefixes:

- `sm:` - Small screens (640px+)
- `md:` - Medium screens (768px+)
- `lg:` - Large screens (1024px+)
- `xl:` - Extra large screens (1280px+)

```html
<!-- Responsive Grid -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <div class="bg-white p-6 rounded-lg shadow">Card 1</div>
    <div class="bg-white p-6 rounded-lg shadow">Card 2</div>
    <div class="bg-white p-6 rounded-lg shadow">Card 3</div>
</div>

<!-- Responsive Text -->
<h1 class="text-2xl md:text-3xl lg:text-4xl font-bold">
    Responsive Heading
</h1>

<!-- Hide/Show on Different Screens -->
<div class="block md:hidden">
    Mobile only
</div>
<div class="hidden md:block">
    Desktop only
</div>

<!-- Responsive Padding -->
<div class="p-4 md:p-6 lg:p-8">
    Responsive padding
</div>
```

## Layout Patterns

### Two-Column Layout

```html
<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Sidebar -->
    <div class="lg:col-span-1">
        <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-lg font-bold mb-4">Sidebar</h2>
            <!-- Sidebar content -->
        </div>
    </div>

    <!-- Main Content -->
    <div class="lg:col-span-2">
        <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-lg font-bold mb-4">Main Content</h2>
            <!-- Main content -->
        </div>
    </div>
</div>
```

### Header with Navigation

```html
<header class="bg-white shadow">
    <div class="container mx-auto px-6 py-4">
        <div class="flex justify-between items-center">
            <h1 class="text-2xl font-bold text-gray-800">My App</h1>
            <nav class="flex gap-4">
                <a href="#" class="text-gray-600 hover:text-gray-900">Home</a>
                <a href="#" class="text-gray-600 hover:text-gray-900">About</a>
                <a href="#" class="text-gray-600 hover:text-gray-900">Contact</a>
            </nav>
        </div>
    </div>
</header>
```

### Full Page Layout

```html
<div class="min-h-screen bg-gray-100">
    <!-- Header -->
    <header class="bg-white shadow">
        <div class="container mx-auto px-6 py-4">
            <h1 class="text-2xl font-bold">My Application</h1>
        </div>
    </header>

    <!-- Main Content -->
    <main class="container mx-auto px-6 py-8">
        <div class="bg-white rounded-lg shadow p-6">
            <!-- Your content here -->
        </div>
    </main>

    <!-- Footer -->
    <footer class="bg-gray-800 text-white mt-8">
        <div class="container mx-auto px-6 py-4 text-center">
            <p>&copy; 2024 My Application</p>
        </div>
    </footer>
</div>
```

## Interactive States

### Hover Effects

```html
<!-- Hover Background -->
<button class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
    Hover me
</button>

<!-- Hover Scale -->
<div class="transform hover:scale-105 transition duration-200">
    Scales on hover
</div>

<!-- Hover Shadow -->
<div class="shadow hover:shadow-lg transition duration-200">
    Shadow increases on hover
</div>
```

### Focus States

```html
<input
    type="text"
    class="border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
>
```

### Transitions

```html
<!-- Smooth Transition -->
<button class="bg-blue-500 hover:bg-blue-600 transition duration-300">
    Smooth transition
</button>

<!-- Multiple Properties -->
<div class="transform hover:scale-110 hover:bg-blue-500 transition-all duration-300">
    Multiple transitions
</div>
```

## Best Practices

### 1. Use Consistent Spacing

Stick to Tailwind's spacing scale:

```html
<!-- ✅ GOOD: Consistent spacing -->
<div class="p-4 m-2">
<div class="p-6 m-4">
<div class="p-8 m-6">

<!-- ❌ AVOID: Arbitrary values -->
<div style="padding: 17px; margin: 13px">
```

### 2. Maintain Color Consistency

Use Tailwind's color palette:

```html
<!-- ✅ GOOD: Consistent colors -->
<div class="bg-blue-500 text-white">
<div class="bg-blue-600 text-white">
<div class="bg-blue-700 text-white">

<!-- ❌ AVOID: Custom colors -->
<div style="background: #1E3F8F">
```

### 3. Mobile-First Approach

Start with mobile styles, then add breakpoints:

```html
<!-- ✅ GOOD: Mobile-first -->
<div class="text-sm md:text-base lg:text-lg">
    Responsive text
</div>

<!-- ❌ AVOID: Desktop-first -->
<div class="text-lg md:text-sm">
    Wrong approach
</div>
```

### 4. Group Related Classes

```html
<!-- ✅ GOOD: Logical grouping -->
<button class="
    bg-blue-500 hover:bg-blue-600
    text-white
    px-4 py-2
    rounded-md
    shadow-md hover:shadow-lg
    transition duration-200
">
    Well organized
</button>
```

### 5. Use Semantic Class Names for Complex Components

For reusable components, consider wrapper elements:

```html
<div class="task-card">
    <div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
        <!-- Card content -->
    </div>
</div>
```

## Common Color Schemes

### Blue Theme

```html
<div class="bg-blue-500 text-white p-4 rounded">Primary</div>
<div class="bg-blue-600 text-white p-4 rounded">Darker</div>
<div class="bg-blue-100 text-blue-800 p-4 rounded">Light</div>
```

### Success/Error/Warning

```html
<!-- Success (Green) -->
<div class="bg-green-500 text-white p-4 rounded">Success</div>

<!-- Error (Red) -->
<div class="bg-red-500 text-white p-4 rounded">Error</div>

<!-- Warning (Yellow) -->
<div class="bg-yellow-500 text-white p-4 rounded">Warning</div>

<!-- Info (Blue) -->
<div class="bg-blue-500 text-white p-4 rounded">Info</div>
```

### Grayscale

```html
<div class="bg-gray-50 p-4">Very light gray</div>
<div class="bg-gray-100 p-4">Light gray</div>
<div class="bg-gray-200 p-4">Gray</div>
<div class="bg-gray-700 text-white p-4">Dark gray</div>
<div class="bg-gray-900 text-white p-4">Very dark gray</div>
```

## Quick Reference

### Spacing Scale

- `p-1` = 0.25rem (4px)
- `p-2` = 0.5rem (8px)
- `p-4` = 1rem (16px)
- `p-6` = 1.5rem (24px)
- `p-8` = 2rem (32px)

### Common Combinations

```html
<!-- Card -->
<div class="bg-white rounded-lg shadow-md p-6">

<!-- Button -->
<button class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">

<!-- Input -->
<input class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500">

<!-- Badge -->
<span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
```

## Resources

- **Tailwind CSS Documentation**: https://tailwindcss.com/docs
- **Tailwind UI Components**: https://tailwindui.com/components
- **Color Reference**: https://tailwindcss.com/docs/customizing-colors

## Next Steps

- **[Complete Examples](Live-Pages-Examples.md)** - See Tailwind styling in full applications
- **[Creating Live Pages](Creating-Live-Pages.md)** - Back to main guide
- **[Data Management API Reference](Data-Management-API.md)** - Learn about data operations
