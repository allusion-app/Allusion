pub trait UnwrapOrAbort<T> {
    fn unwrap_or_abort(self) -> T;
}

impl<T> UnwrapOrAbort<T> for Option<T> {
    #[inline]
    fn unwrap_or_abort(self) -> T {
        match self {
            Some(v) => v,
            None => std::process::abort(),
        }
    }
}

impl<T, E> UnwrapOrAbort<T> for Result<T, E> {
    #[inline]
    fn unwrap_or_abort(self) -> T {
        match self {
            Ok(v) => v,
            Err(_) => std::process::abort(),
        }
    }
}
