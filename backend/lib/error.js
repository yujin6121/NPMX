export class ValidationError extends Error {
    constructor(message, previous) {
        super(message);
        this.name = 'ValidationError';
        this.statusCode = 400;
        this.previous = previous;
    }
}

export class AuthError extends Error {
    constructor(message, previous) {
        super(message);
        this.name = 'AuthError';
        this.statusCode = 401;
        this.previous = previous;
    }
}

export class PermissionError extends Error {
    constructor(message, previous) {
        super(message);
        this.name = 'PermissionError';
        this.statusCode = 403;
        this.previous = previous;
    }
}

export class ItemNotFoundError extends Error {
    constructor(id) {
        super(`Item #${id} not found`);
        this.name = 'ItemNotFoundError';
        this.statusCode = 404;
    }
}

export class InternalValidationError extends Error {
    constructor(message, previous) {
        super(message);
        this.name = 'InternalValidationError';
        this.statusCode = 500;
        this.previous = previous;
    }
}

export default {
    ValidationError,
    AuthError,
    PermissionError,
    ItemNotFoundError,
    InternalValidationError,
};
