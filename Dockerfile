FROM php:8.0-apache

# Copy project files
COPY . /var/www/html/

# Ensure permissions
RUN chown -R www-data:www-data /var/www/html \
    && a2enmod rewrite

EXPOSE 80

CMD ["apache2-foreground"]
