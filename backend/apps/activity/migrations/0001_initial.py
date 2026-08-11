# Generated migration for apps.activity

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Activity',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField(db_index=True)),
                ('name', models.CharField(max_length=200)),
                ('duration_minutes', models.PositiveIntegerField(blank=True, null=True)),
                ('calories_burned', models.PositiveIntegerField()),
                ('notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'ordering': ['-date', '-created_at'],
            },
        ),
    ]
